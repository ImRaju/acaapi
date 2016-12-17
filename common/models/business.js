var solr = require('solr-client');

module.exports = function(Biz) {
  Biz.observe('before save', function(ctx,next){
    if (ctx.currentInstance) {
      var bObj = {};
      var ci   = ctx.currentInstance;
      //initialize before object
      bObj['code'] = ci.code;
      bObj['title'] = ci.title;
      bObj['type'] = ci.type;
      bObj['brief'] = ci.brief;
      bObj['detail'] = ci.detail;
      bObj['skills'] = ci.skills;
      bObj['profile'] = ci.profile;
    }
    ctx.hookState.before = bObj;
    next();
  });

  Biz.observe('after save', function(ctx,next){
    //asign role
    if (ctx.instance) {
      if(ctx.isNewInstance) {
        var RoleMapping = Biz.app.models.RoleMapping;
        var Role = Biz.app.models.Role;
        Role.findOne({
          'where': {
            'name': 'business'
          }}, function(err,found){
            if(err) console.error('err in business role findOne', err);
            else if(found){
              RoleMapping.create({
                'principalType': RoleMapping.USER,
                'principalId': ctx.instance.userId,
                'roleId': found.id
              }, function(err, roleMapping) {
                if (err) console.error('err in creating roleMapping for business',err);
              })
            }
          }
        )
      }
    }
    //business history
    var before = ctx.hookState.before; 
    var after  = ctx.instance;
    ctx.instance.history.create(
      {
        'b': before,
        'a': after,
        'logdate': new Date,
        'status': 'default',
        'tag': 'default',
        'type': 'default'
      },function(err,data){
        if(err) console.log('Business history error ',err);
      })
    next();
  });

  //email verification after signup
  Biz.afterRemote('signup', function(context, business, next) {
    var vOptions = Biz.app.get('emailVerificationOptions');
    var options = {
      type: vOptions.type,
      to: business.user.email,
      from: vOptions.from,
      subject: vOptions.subject,
      //template: path.resolve(__dirname, vOptions.template),
      redirect: vOptions.redirect,
      user: business.user
    };

    business.user.verify(options, function(err, response) {
      if (err) next(err);
      console.log('> verification email sent');
    });
    next();
  });

  //create buisiness method
  Biz.createBuisiness = function(title,type,next){
    Biz.create({
      'code': 'buisiness-' + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
      'title': title,
      'type': type
    }, function(err,biz){
      if(err) next(err);
      else next(null,biz);
    });
  }

  // register a post method for procourses
  Biz.remoteMethod(
    'Bizjob',
    {
      http: {path: '/createBizjob', verb: 'post'},
      accepts: [
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: true},
        {arg: 'stream', type: 'string', required: true},
        {arg: 'jobId', type: 'string', required: false},
      ],
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'create a procourses'
    }
  )

  Biz.prototype.Bizjob = function(title,type,stream,jobId,next){
    var bizId = this.id;
    if(jobId){
      //find job by jobId
      Biz.app.models.job.findById(jobId,function(err,job){
        if(err) next(err);
        if(job){
          //found job create bizjob
          Biz.app.models.bizjob.createBizjob(title,type,jobId,bizId,function(err,bizjob){
            if(err) next(err);
            else next(null,bizjob);
          });
        }else{
          var err = new Error('jobId is not valid');
          err.statusCode = 404;
          next(err);
        }
      });
    }else{
      //find job by title
      Biz.app.models.job.findOne({
        'where': {'title': title}
      }, function(err,job){
        if(err) next(err);
        else if(job){
          //found job create bizjob
          Biz.app.models.bizjob.createBizjob(title,type,job.id,bizId,function(err,bizjob){
            if(err) next(err);
            else next(null,bizjob);
          });
        }else{
          //not found create job
          Biz.app.models.job.createJob(title,type,stream,function(err,job){
            if(err) next(err);
            else{
              //create bizjob
              Biz.app.models.bizjob.createBizjob(title,type,job.id,bizId,function(err,bizjob){
                if(err) next(err);
                else next(null,bizjob);
              });
            }
          });
        }
      });
    }
  }

  // register a busieness detail remote method
  Biz.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'business details'
    }
  );

  Biz.prototype.details = function(next){
    var bizFilter = Biz.app.get('bizFilter');
    Biz.findById(this.id, bizFilter, function(err,biz){
      if(err) next(err);
      else next(null,biz);
    });
  };

  // busieness signup method
  Biz.remoteMethod(
    'signup',
    {
      http: {path: '/signup', verb: 'post'},
      accepts: [
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: true},
        {arg: 'email', type: 'string', required: true},
        {arg: 'password', type: 'string', required: true},
      ],
      returns: {root: true, type: 'object'},
      description: 'signup as a business'
    }
  );

  Biz.signup = function(title,type,email,password,next){
    //first create a user
    Biz.app.models.User.create({
      'username': email,
      'email': email,
      'password': password
    }, function(err,user){
      if(err) next(err);
      else if(user){
        //if user created then create business
        Biz.create({
          'title': title,
          'type': type,
          'code': "business-" + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
          'userId': user.id
        }, function(err,biz){
          if(err) next(err);
          else {
            var res = {};
            res.business = biz;
            res.user = user;
            next(null,res);
          }
        });
      }
    });
  }

  // register a business search remote method
  Biz.remoteMethod(
    'search',
    {
      http: {path: '/search', verb: 'get'},
      accepts: [
        {arg: 'query', type: 'string', required: false},
        {arg: 'filter', type: 'object', required: false},
        {arg: 'facet', type: 'object', required: false},
        {arg: 'limit', type: 'string', description:'start:rows', required: false},
        /*{arg: 'title', type: 'string', required: false},
        {arg: 'code', type: 'string', required: false},
        {arg: 'skills', type: 'array', description:'array of skills', required: false},
        {arg: 'rating', type: 'number', description:'decimal format eg- min.max',required: false},
        {arg: 'type', type: 'array', description:'array of type', required: false},
        {arg: 'limit', type: 'number', required: false},*/
      ],
      returns: {root: true, type: 'object'},
      description: 'business search'
    }
  );

  Biz.search = function(query,filter,facet/*title,code,skills,rating,type*/,limit,next){
    //solr search
    var start = 0; var rows = 10;
    var q = query || '*';
    if(limit){
      lObj = limit.split(":", 2);
      start = lObj[0];
      rows = lObj[1];
    }
    var client = solr.createClient(Biz.app.get("bSolrParams"));
    var query = client.createQuery().q(q)/*.mm(2)*/.start(start).rows(rows);

    for(var key in filter){
      //if filter[key] is array
      if(Object.prototype.toString.apply(filter[key]) == '[object Array]'){
        var parameter = '';

        for(var i=0; i<filter[key].length; i++){
          if(i==0)
            filter[key][0] = '"'+filter[key][0]+'"'; //for multiple words containing string
          else
            filter[key][i] = key + ':' +'"'+filter[key][i]+'"';
        }
        parameter += filter[key].join(' OR ');
        query = query.matchFilter(key,parameter);
        
      }else if(filter[key]){
        if(typeof filter[key] == 'string')
          query = query.matchFilter(key,'"'+filter[key]+'"');
        else
          query = query.matchFilter(key,filter[key]);
      }
    }

    //facet
    if(facet){
      query = query.facet(facet);
      query.parameters.push('json.nl=map');
    }

    client.search(query,function(err,obj){
      if(err) next(err);
      else next(null,obj);
    });
    //mongo search
    /*var bizSearch = Biz.app.get('bizSearch');
    var rule = {};
    if(title){
      var title = new RegExp('.*'+title+'.*', "i"); // case-insensitive RegExp search 
      rule['title'] = { 'like': title};
    }
    if(code) rule['code'] = {'regexp': code};
    if(skills.length) rule['skills.code'] = {'inq':skills};
    if(type.length) rule['type'] = {'inq':type};
    //TODO: filter on the basis of rating rating 

    Biz.find({
      'where': rule,
      'fields': bizSearch.fields,
      'limit': limit
    }, function(err,business){
      if(err) next(err);
      else next(null,business);
    });*/
  };

  // add people
  Biz.remoteMethod(
    'setPeople',
    {
      http: {path: '/setPeople', verb: 'post'},
      accepts:[
        { arg: 'people', type: ['peoplebit'], http: { source: 'body' }}
      ],
      isStatic: false,
      returns: {arg: "data", type: "peoplebit", root: true},
      description: 'set people'
    }
  );

  Biz.prototype.setPeople = function(people, next){
    Biz.findById(this.id, function(err,biz){
      if(err) next(err);
      else{
        if(people[0].people) //only for Front End response
          people = people[0].people;
        biz.updateAttributes({
          'people': people
        }, function(err,people){
          if(err) next(err);
          else next(null,people);
        });
      }
    });
  }

  // add quotes
  Biz.remoteMethod(
    'setQuotes',
    {
      http: {path: '/setQuotes', verb: 'post'},
      accepts:[
        { arg: 'quotes', type: ['quotesbit'], http: { source: 'body' }}
      ],
      isStatic: false,
      returns: {arg: "data", type: "quotesbit", root: true},
      description: 'set quotes'
    }
  );

  Biz.prototype.setQuotes = function(quotes, next){
    Biz.findById(this.id, function(err,biz){
      if(err) next(err);
      else{
        if(quotes[0].quotes) //only for Front End response
          quotes = quotes[0].quotes;
        biz.updateAttributes({
          'quotes': quotes
        }, function(err,quotes){
          if(err) next(err);
          else next(null,quotes);
        });
      }
    });
  }

  // add skills
  Biz.remoteMethod(
    'setSkills',
    {
      http: {path: '/setSkills', verb: 'post'},
      accepts:[
        { arg: 'skills', type: ['skillbit'], http: { source: 'body' }}
      ],
      isStatic: false,
      returns: {arg: "data", type: "skillbit", root: true},
      description: 'set skills'
    }
  );

  Biz.prototype.setSkills = function(skills, next){
    Biz.findById(this.id, function(err,biz){
      if(err) next(err);
      else{
        if(skills[0].skills) //only for Front End response
          skills = skills[0].skills;
        biz.updateAttributes({
          'skills': skills
        }, function(err,skills){
          if(err) next(err);
          else next(null,skills);
        });
      }
    });
  }

  // register a business lookup remote method
  Biz.remoteMethod(
    'lookup',
    {
      http: {path: '/lookup', verb: 'get'},
      accepts: [
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: false},
        {arg: 'limit', type: 'number', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'business lookup'
    }
  );

  Biz.lookup = function(title,type,limit,next){
    var bObj = [];
    //TODO: type and limit will be used later if necessary
    var scoreService = Biz.app.dataSources.scoreService;
    scoreService.create('companies/lookup',{'key':title},'',function(err,business){
      if(err) next(err);
      else {
        business.forEach(function(biz){
          var splittedObj = biz.split('|');
          var title = splittedObj[0].trim();
          var restObj = splittedObj[1].trim();
          var reSplitObj = restObj.split(';');
          var lasElem = reSplitObj[reSplitObj.length-1].trim();

          if(lasElem.indexOf('employees') !== -1){
            var size = lasElem;
            var industry = reSplitObj.slice(0,reSplitObj.length-1);
            bObj.push({title,industry,size});
          }else{
            var industry = reSplitObj;
            bObj.push({title,industry,size});
          }
        })
        next(null,bObj);
      }
    })
    /*if(limit && limit >10) limit = 10;
    Biz.find({
      'where': {'title': {'regexp': title}, 'type': type},
      'fields': ['title','type','id'],
      'limit': limit || 10
    }, function(err,business){
      if(err) next(err);
      else next(null,business);
    });*/
  };

  // register a business uploadmedia remote method
  Biz.remoteMethod(
    'uploadMedia',
    {
      http: {path: '/uploadMedia', verb: 'post'},
      accepts: [
        {arg: 'req', type: 'object', http: {source: 'req'}, required: true},
      ],
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'upload media'
    }
  );

  Biz.prototype.uploadMedia = function(req,next){
    var bizId = this.id;
    var baseUrl = 'http://'+Biz.app.get('host')+':'+ Biz.app.get('port')+'/api/containers/';
    Biz.findById(bizId, function(err,biz){
      if(err) next(err);
      else if(biz){
        var galObj = biz.gallery || {};
        Biz.upload(bizId,req, function(err,file){
          if(err) next(err);
          else{
            //set gallery object
            if(file.files.pic){
              galObj['pic'] = baseUrl+file.files.pic[0].container+'/download/'+file.files.pic[0].name
            }
            if(file.files.banner){
              galObj['banner'] = baseUrl+file.files.banner[0].container+'/download/'+file.files.banner[0].name
            }
            //update gallery
            biz.updateAttributes({
              'gallery': galObj
            }, function(err,done){
              if(err) next(err);
              else next(null,done);
            })
          }
        })
      }
    })
  }
  
  //method for media upload
  Biz.upload = function(id,req,next){
    var Container = Biz.app.models.container;
    //find container
    Container.getContainer('media'+id, function(err,container){
      if(err) {
        //not found
        Container.createContainer({
          'name': 'media'+id
        }, function(err,con){
          if(err) next(err);
          else{
            Container.upload(req,{},{container:'media'+id}, function(err,file){
              if(err) next(err);
              else next(null,file);
            })
          }
        })
      }
      else if(container){
        //upload media
        Container.upload(req, {},{container:'media'+id}, function(err,file){
          if(err) next(err);
          else next(null,file);
        })        
      }
    })
  }

  // Register a 'index' remote method
  Biz.remoteMethod(  
    'index',
    {
      http: {path: '/index', verb: 'post'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'indexes a business of given id'
    }
  );

  Biz.prototype.index = function(next){
    var bObj = {};
    var client = solr.createClient(Biz.app.get("bSolrParams"));
    var pic = '';var location = ''; var skills = [];
    var j_type = [];
    var j_stream = [];
    var bj_type = [];
    var bj_title = [];

    Biz.findById(this.id,{
      'include': ['jobs','bizjobs']
    }, function(err,b){
      if(err) next(err);
      else if(b){
        if(b.gallery && b.gallery.pic)
          pic = b.gallery.pic;
        if(b.location)
          location = [b.location.city,b.location.state,b.location.country];

        //skills
        if(b.skills){
          b.skills.forEach(function(skill){
            skills.push(skill.code);
          })
        }
        //job type & stream
        b.jobs().forEach(function(j){
          if(j.stream) j_stream.push(j.stream);
          j_type.push(j.type);
        })

        //bizjob type & title
        b.bizjobs().forEach(function(bj){
          bj_type.push(bj.type);
          bj_title.push(bj.title);
        })

        bObj = {'id':b.id,'title':b.title,'code':b.code,'type':b.type,'brief':b.brief,'detail':b.detail,
            'pic': pic,'status':b.status,'tagline':b.tagline,'location':location,'skills':skills,'j_type':j_type,'j_stream':j_stream,
            'bj_type':bj_type,'bj_title':bj_title};


        //indexing solr
        client.add(bObj, function(err,done){
          if(err) next(err);
          else {
            client.commit(function(err,res){
              if(err) next(err);
              if(res) next(null,res);
            });
          }
        })
      }
    })
  }

  // create interaction
  Biz.remoteMethod(
    'createInteraction',
    {
      http: {path: '/createInteraction', verb: 'post'},
      accepts: [
        { arg: 'data', type: 'interaction', http: { source: 'body' }},
      ],
      isStatic: false,
      returns: {arg: "interaction", type: "interaction", root: true},
      description: 'create interaction'
    }
  );

  Biz.prototype.createInteraction = function(data,next){
    //TODO: validate relations
    Biz.app.models.interaction.create(data, function(err,interaction){
      if(err) next(err)
      else next(null,interaction)
    })
  }
  
  Biz.disableRemoteMethod('find',true);
  Biz.disableRemoteMethod('upsert',true);
  Biz.disableRemoteMethod('create',true);
  Biz.disableRemoteMethod('exists',true);
  Biz.disableRemoteMethod('updateAll', true);
  Biz.disableRemoteMethod('count', true);
  Biz.disableRemoteMethod('findOne',true);
  Biz.disableRemoteMethod('deleteById',true);
  Biz.disableRemoteMethod('__count__skill', false);
  Biz.disableRemoteMethod('__destroy__profile',false);
  Biz.disableRemoteMethod('__delete__activity',false);
  Biz.disableRemoteMethod('__destroyById__activity', false);
  Biz.disableRemoteMethod('__count__activity', false);
  Biz.disableRemoteMethod('__create__bizjobs',false);
  Biz.disableRemoteMethod('__delete__bizjobs',false);
  Biz.disableRemoteMethod('__destroyById__bizjobs', false);
  Biz.disableRemoteMethod('__count__bizjobs', false);
  Biz.disableRemoteMethod('__count__creviews',false);
  Biz.disableRemoteMethod('__get__creviews',false);
  Biz.disableRemoteMethod('__create__creviews',false);
  Biz.disableRemoteMethod('__delete__creviews',false);
  Biz.disableRemoteMethod('__findById__creviews',false);
  Biz.disableRemoteMethod('__updateById__creviews',false);
  Biz.disableRemoteMethod('__destroyById__creviews',false);
  Biz.disableRemoteMethod('__get__history',false);
  Biz.disableRemoteMethod('__findById__history',false);
  Biz.disableRemoteMethod('__create__history', false);
  Biz.disableRemoteMethod('__delete__history',false);
  Biz.disableRemoteMethod('__updateById__history', false);
  Biz.disableRemoteMethod('__destroyById__history', false);
  Biz.disableRemoteMethod('__count__history', false);
  Biz.disableRemoteMethod('__delete__ireviews',false);
  Biz.disableRemoteMethod('__destroyById__ireviews', false);
  Biz.disableRemoteMethod('__count__ireviews', false);
  Biz.disableRemoteMethod('__create__jobs',false);
  Biz.disableRemoteMethod('__delete__jobs',false);
  Biz.disableRemoteMethod('__updateById__jobs', false);
  Biz.disableRemoteMethod('__destroyById__jobs', false);
  Biz.disableRemoteMethod('__count__jobs', false);
  Biz.disableRemoteMethod('__exists__jobs',false);
  Biz.disableRemoteMethod('__link__jobs',false);
  Biz.disableRemoteMethod('__unlink__jobs',false);
  Biz.disableRemoteMethod('__create__reviews',false);
  Biz.disableRemoteMethod('__delete__reviews',false);
  Biz.disableRemoteMethod('__updateById__reviews', false);
  Biz.disableRemoteMethod('__destroyById__reviews', false);
  Biz.disableRemoteMethod('__count__reviews', false);
  Biz.disableRemoteMethod('__count__sreviews',false);
  Biz.disableRemoteMethod('__get__sreviews',false);
  Biz.disableRemoteMethod('__create__sreviews',false);
  Biz.disableRemoteMethod('__delete__sreviews',false);
  Biz.disableRemoteMethod('__findById__sreviews',false);
  Biz.disableRemoteMethod('__updateById__sreviews',false);
  Biz.disableRemoteMethod('__destroyById__sreviews',false);
  Biz.disableRemoteMethod('__create__interactions',false);
  Biz.disableRemoteMethod('__delete__interactions',false);
  Biz.disableRemoteMethod('__updateById__interactions',false);
  Biz.disableRemoteMethod('__destroyById__interactions', false);
  Biz.disableRemoteMethod('__count__interactions', false);
  Biz.disableRemoteMethod('createChangeStream', true);
};
