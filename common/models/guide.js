var solr = require('solr-client');

module.exports = function(Guide) {
  Guide.observe('before save', function(ctx,next){
    if (ctx.currentInstance) {
      var bObj = {};
      var ci   = ctx.currentInstance;
      //initialize before object
      bObj['code'] = ci.code;
      bObj['fname'] = ci.fname;
      bObj['lname'] = ci.lname;
      bObj['type'] = ci.type;
      bObj['brief'] = ci.brief;
      bObj['detail'] = ci.detail;
      bObj['skills'] = ci.skills;
      bObj['location'] = ci.location;
    }
    ctx.hookState.before = bObj;
    next();
  });

  Guide.observe('after save', function(ctx,next){
    //asign role
    if (ctx.instance) {
      if(ctx.isNewInstance) {
        var RoleMapping = Guide.app.models.RoleMapping;
        var Role = Guide.app.models.Role;
        Role.findOne({
          'where': {
            'name': 'guide'
          }}, function(err,found){
            if(err) console.error('err in guide role findOne', err);
            else if(found){
              RoleMapping.create({
                'principalType': RoleMapping.USER,
                'principalId': ctx.instance.userId,
                'roleId': found.id
              }, function(err, roleMapping) {
                if (err) console.error('err in creating roleMapping for guide',err);
              })
            }
          }
        )
      }
    }
    //guide history
    var before = ctx.hookState.before; 
    var after  = ctx.instance;
    ctx.instance.history.create(
      {
        'b': before,
        'a': after,
        'logdate': new Date(),
        'status': 'default',
        'tag': 'default',
        'type': 'default'
      },function(err,data){
        if(err) console.log('Guide history error ',err);
      })
    next();
  });

  //email verification after signup
  Guide.afterRemote('signup', function(context, guide, next) {
    var vOptions = Guide.app.get('emailVerificationOptions');
    var options = {
      type: vOptions.type,
      to: guide.user.email,
      from: vOptions.from,
      subject: vOptions.subject,
      //template: path.resolve(__dirname, vOptions.template),
      redirect: vOptions.redirect,
      user: guide.user
    };

    guide.user.verify(options, function(err, response) {
      if (err) next(err);
      console.log('> verification email sent');
    });
    next();
  });

  // register a post method for procourses
  Guide.remoteMethod(
    'Procourse',
    {
      http: {path: '/createProcourse', verb: 'post'},
      accepts: [
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: true},
        {arg: 'stream', type: 'string', required: true},
        {arg: 'courseId', type: 'string', required: false},
      ],
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'create a procourses'
    }
  )

  Guide.prototype.Procourse = function(title,type,stream,courseId,next){
    var guideId = this.id;
    if(courseId){
      //find course by courseId
      Guide.app.models.course.findById(courseId,function(err,course){
        if(err) next(err);
        if(course){
          //found course create procourse
          Guide.app.models.procourse.createProcourse(title,type,courseId,'guide',guideId,function(err,procourse){
            if(err) next(err);
            else next(null,procourse);
          });
        }else{
          var err = new Error('courseId is not valid');
          err.statusCode = 404;
          next(err);
        }
      });
    }else{
      //find course by title
      Guide.app.models.course.findOne({
        'where': {'title': title}
      }, function(err,course){
        if(err) next(err);
        else if(course){
          //found course create procourse
          Guide.app.models.procourse.createProcourse(title,type,course.id,'guide',guideId,function(err,procourse){
            if(err) next(err);
            else next(null,procourse);
          });
        }else{
          //not found create course
          Guide.app.models.course.createCourse(title,type,stream,function(err,course){
            if(err) next(err);
            else{
              //create procourse
              Guide.app.models.procourse.createProcourse(title,type,course.id,'guide',guideId,function(err,procourse){
                if(err) next(err);
                else next(null,procourse);
              });
            }
          });
        }
      });
    }
  }

  // register a guide details remote method
  Guide.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'guide details'
    }
  );

  Guide.prototype.details = function(next){
    var guideFilter = Guide.app.get('guideFilter');
    Guide.findById(this.id, guideFilter, function(err,guide){
      if(err) next(err);
      else next(null,guide);
    });
  };

  // guide signup method
  Guide.remoteMethod(
    'signup',
    {
      http: {path: '/signup', verb: 'post'},
      accepts: [
        {arg: 'fname', type: 'string', required: true},
        {arg: 'lname', type: 'string', required: true},
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: true},
        {arg: 'email', type: 'string', required: true},
        {arg: 'password', type: 'string', required: true},
      ],
      returns: {root: true, type: 'object'},
      description: 'signup as a guide'
    }
  );

  Guide.signup = function(fname,lname,title,type,email,password,next){
    //first create a user
    Guide.app.models.User.create({
      'username': email,
      'email': email,
      'password': password
    }, function(err,user){
      if(err) next(err);
      else if(user){
        //if user created then create guide
        Guide.create({
          'fname': fname,
          'lname': lname,
          'title': title,
          'type': type,
          'code': "guide-" + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
          'userId': user.id
        }, function(err,guide){
          if(err) next(err);
          else{
            var res = {};
            res.guide = guide;
            res.user = user;
            next(null,res);
          }
        });
      }
    });
  }

  // register a guide search remote method
  Guide.remoteMethod(
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
      description: 'guide search'
    }
  );

  Guide.search = function(query,filter,facet/*title,code,skills,rating,type*/,limit,next){
    //solr search
    var start = 0; var rows = 10;
    var q = query || '*'
    if(limit){
      lObj = limit.split(":", 2);
      start = lObj[0];
      rows = lObj[1];
    }
    var client = solr.createClient(Guide.app.get("gSolrParams"));
    var query = client.createQuery().q(q)/*.mm(2)*/.start(start).rows(rows);
    //filter
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
    /*var guideSearch = Guide.app.get('guideSearch');
    var rule = {};
    if(title){
      var title = new RegExp('.*'+title+'.*', "i"); // case-insensitive RegExp search
      rule['title'] = { 'like': title};
    }
    if(code) rule['code'] = {'regexp': code};
    if(skills.length) rule['skills.code'] = {'inq':skills};
    if(type.length) rule['type'] = {'inq':type};
    //TODO: filter on the basis of rating rating 

    Guide.find({
      'where': rule,
      'fields': guideSearch.fields,
      'limit': limit
    }, function(err,guide){
      if(err) next(err);
      else next(null,guide);
    });*/
  };

  // add skills
  Guide.remoteMethod(
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

  Guide.prototype.setSkills = function(skills, next){
    Guide.findById(this.id, function(err,guide){
      if(err) next(err);
      else{
        if(skills[0].skills) //only for Front End response
          skills = skills[0].skills;
        guide.updateAttributes({
          'skills': skills
        }, function(err,skills){
          if(err) next(err);
          else next(null,skills);
        });
      }
    });
  }

  // register a guide uploadmedia remote method
  Guide.remoteMethod(
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

  Guide.prototype.uploadMedia = function(req,next){
    var gId = this.id;
    var baseUrl = 'http://'+Guide.app.get('host')+':'+ Guide.app.get('port')+'/api/containers/';
    Guide.findById(gId, function(err,guide){
      if(err) next(err);
      else if(guide){
        var galObj = guide.gallery || {};
        Guide.app.models.business.upload(gId,req, function(err,file){
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
            guide.updateAttributes({
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

  // Register a 'index' remote method
  Guide.remoteMethod(  
    'index',
    {
      http: {path: '/index', verb: 'post'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'indexes a guide of given id'
    }
  );

  Guide.prototype.index = function(next){
    var gObj = {};
    var client = solr.createClient(Guide.app.get("gSolrParams"));
    var pic = '';var location = ''; var skills = [];
    var c_type = [];
    var c_stream = [];
    var pc_type = [];
    var pc_title = [];

    Guide.findById(this.id,{
      'include': ['courses','procourses']
    }, function(err,g){
      if(err) next(err);
      else if(g){
        if(g.gallery && g.gallery.pic)
          pic = g.gallery.pic;
        if(g.location)
          location = [g.location.city,g.location.state,g.location.country];

        //skills
        if(g.skills){
          g.skills.forEach(function(skill){
            skills.push(skill.code);
          })
        }

        //course type & stream
        g.courses().forEach(function(c){
          if(c.stream) c_stream.push(c.stream);
          c_type.push(c.type);
        })

        //procourse type & title
        g.procourses().forEach(function(pc){
          pc_type.push(pc.type);
          pc_title.push(pc.title);
        })

        gObj = {'id':g.id,'title':g.title,'code':g.code,'type':g.type,'brief':g.brief,'detail':g.detail,
            'pic': pic,'status':g.status,'location':location,'skills':skills,'c_type':c_type,'c_stream':c_stream,
            'pc_type':pc_type,'pc_title':pc_title};

        //indexing solr
        client.add(gObj, function(err,done){
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
  Guide.remoteMethod(
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

  Guide.prototype.createInteraction = function(data,next){
    //TODO: validate relations
    Guide.app.models.interaction.create(data, function(err,interaction){
      if(err) next(err)
      else next(null,interaction)
    })
  }

  Guide.disableRemoteMethod('find',true);
  Guide.disableRemoteMethod('upsert',true);
  Guide.disableRemoteMethod('create',true);
  Guide.disableRemoteMethod('updateAll', true);
  Guide.disableRemoteMethod('findOne', true);
  Guide.disableRemoteMethod('count', true);
  Guide.disableRemoteMethod('exists', true);
  Guide.disableRemoteMethod('deleteById',true);
  Guide.disableRemoteMethod('__delete__activity',false);
  Guide.disableRemoteMethod('__destroyById__activity', false);
  Guide.disableRemoteMethod('__count__activity', false);
  Guide.disableRemoteMethod('__create__courses', false);
  Guide.disableRemoteMethod('__delete__courses',false);
  Guide.disableRemoteMethod('__updateById__courses', false);
  Guide.disableRemoteMethod('__destroyById__courses', false);
  Guide.disableRemoteMethod('__count__courses', false);
  Guide.disableRemoteMethod('__exists__courses',false);
  Guide.disableRemoteMethod('__link__courses',false);
  Guide.disableRemoteMethod('__unlink__courses',false);
  Guide.disableRemoteMethod('__get__history',false);
  Guide.disableRemoteMethod('__findById__history',false);
  Guide.disableRemoteMethod('__create__history', false);
  Guide.disableRemoteMethod('__delete__history',false);
  Guide.disableRemoteMethod('__updateById__history', false);
  Guide.disableRemoteMethod('__destroyById__history', false);
  Guide.disableRemoteMethod('__count__history', false);
  Guide.disableRemoteMethod('__delete__ireviews',false);
  Guide.disableRemoteMethod('__destroyById__ireviews', false);
  Guide.disableRemoteMethod('__count__ireviews', false);
  Guide.disableRemoteMethod('__create__procourses',false);
  Guide.disableRemoteMethod('__delete__procourses',false);
  Guide.disableRemoteMethod('__destroyById__procourses', false);
  Guide.disableRemoteMethod('__count__procourses', false);
  Guide.disableRemoteMethod('__create__reviews',false);
  Guide.disableRemoteMethod('__delete__reviews',false);
  Guide.disableRemoteMethod('__destroyById__reviews', false);
  Guide.disableRemoteMethod('__updateById__reviews', false);
  Guide.disableRemoteMethod('__count__reviews', false);
  Guide.disableRemoteMethod('__create__schools', false);
  Guide.disableRemoteMethod('__delete__schools',false);
  Guide.disableRemoteMethod('__updateById__schools', false);
  Guide.disableRemoteMethod('__destroyById__schools', false);
  Guide.disableRemoteMethod('__count__schools', false);
  Guide.disableRemoteMethod('__exists__schools',false);
  Guide.disableRemoteMethod('__link__schools',false);
  Guide.disableRemoteMethod('__unlink__schools',false);
  Guide.disableRemoteMethod('__count__sreviews',false);
  Guide.disableRemoteMethod('__get__sreviews',false);
  Guide.disableRemoteMethod('__create__sreviews',false);
  Guide.disableRemoteMethod('__delete__sreviews',false);
  Guide.disableRemoteMethod('__findById__sreviews',false);
  Guide.disableRemoteMethod('__updateById__sreviews', false);
  Guide.disableRemoteMethod('__destroyById__sreviews', false);
  //Guide.disableRemoteMethod('__get__profile',false);
  Guide.disableRemoteMethod('__count__skill', false);
  Guide.disableRemoteMethod('__create__profile',false);
  Guide.disableRemoteMethod('__destroy__profile',false);
  Guide.disableRemoteMethod('createChangeStream', true);
  Guide.disableRemoteMethod('__create__interactions',false);
  Guide.disableRemoteMethod('__delete__interactions',false);
  Guide.disableRemoteMethod('__updateById__interactions',false);
  Guide.disableRemoteMethod('__destroyById__interactions', false);
  Guide.disableRemoteMethod('__count__interactions', false);

  Guide.disableRemoteMethod('__create__stuappl', false);
  Guide.disableRemoteMethod('__delete__stuappl',false);
  Guide.disableRemoteMethod('__updateById__stuappl',false);
  Guide.disableRemoteMethod('__destroyById__stuappl', false);
  Guide.disableRemoteMethod('__count__stuappl', false);

  Guide.disableRemoteMethod('__create__student', false);
  Guide.disableRemoteMethod('__delete__student',false);
  Guide.disableRemoteMethod('__updateById__student',false);
  Guide.disableRemoteMethod('__destroyById__student', false);
  Guide.disableRemoteMethod('__count__student', false);
};
