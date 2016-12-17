var solr = require('solr-client');

module.exports = function(School) {
  School.observe('before save', function(ctx,next){
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
    }
    ctx.hookState.before = bObj;
    next();
  });

  School.observe('after save', function(ctx,next){
    //asign role
    if (ctx.instance) {
      if(ctx.isNewInstance) {
        var RoleMapping = School.app.models.RoleMapping;
        var Role = School.app.models.Role;
        Role.findOne({
          'where': {
            'name': 'school'
          }}, function(err,found){
            if(err) console.error('err in school role findOne', err);
            else if(found){
              RoleMapping.create({
                'principalType': RoleMapping.USER,
                'principalId': ctx.instance.userId,
                'roleId': found.id
              }, function(err, roleMapping) {
                if (err) console.error('err in creating roleMapping for school',err);
              })
            }
          }
        )
      }
    }
    //School history
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
        if(err) console.log('School history error ',err);
      })
    next();
  });

  //email verification after signup
  School.afterRemote('signup', function(context, school, next) {
    var vOptions = School.app.get('emailVerificationOptions');
    var options = {
      type: vOptions.type,
      to: school.user.email,
      from: vOptions.from,
      subject: vOptions.subject,
      //template: path.resolve(__dirname, vOptions.template),
      redirect: vOptions.redirect,
      user: school.user
    };

    school.user.verify(options, function(err, response) {
      if (err) next(err);
      console.log('> verification email sent');
    });
    next();
  });

  //create school method
  School.createSchool = function(title,type,next){
    School.create({
      'code': 'school-' + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
      'title': title,
      'type': type
    }, function(err,school){
      if(err) next(err);
      else next(null,school);
    });
  }

  /*NOTE: guide triggered not required at present
  // register a post method for sguide
  School.remoteMethod(
    'Sguides',
    {
      http: {path: '/createSguides', verb: 'post'},
      accepts: [
        {arg: 'email', type: 'string', required: true},
        {arg: 'title', type: 'string', required: true},
        {arg: 'fname', type: 'string', required: true},
        {arg: 'lname', type: 'string', required: true},
        {arg: 'type', type: 'string', required: true},
        {arg: 'dept', type: 'string', required: true},
        {arg: 'about', type: 'string', required: false},
        {arg: 'phone', type: 'string', required: false},
        {arg: 'fax', type: 'string', required: false},
        {arg: 'address', type: 'string', required: false},
        {arg: 'skype', type: 'string', required: false},
      ],
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'create a new school guide'
    }
  );

  School.prototype.Sguides = function(email,title,fname,lname,type,dept,about,phone,fax,address,skype,next){
    var schoolId = this.id;
    //TODO extend trigger with guideId 
    //find user 
    School.app.models.User.findOne({
      'where': {'email': email}
    }, function(err,user){
      if(err) next(err);
      else if(user){
        //check found user is guide or not 
        School.app.models.guide.findOne({
          'where': {'userId': user.id}
        }, function(err,guide){
          if(err) next(err);
          else if(guide){
            //user is guide so create sguide
            School.createSguide(schoolId,guide.id,email,title,type,dept,about,phone,fax,address,skype,function(err,sguide){
              if(err) next(err);
              else next(null,sguide)
            })
          }else{
            //user is not guide so create new guide
            School.createGuide(fname,lname,email,type,title,dept,phone,fax,address,skype,about, function(err,guide){
              if(err) next(err);
              else{
                //then create sguide
                School.createSguide(schoolId,guide.id,email,title,type,dept,about,phone,fax,address,skype,function(err,sguide){
                  if(err) next(err);
                  else next(null,sguide);
                });
              }
            });
          }
        });
      }else{
        //find guide
        School.app.models.guide.findOne({
          'where': {'contact.email': email}
        }, function(err,guide){
          if(err) next(err);
          else if(guide){
            //found now create sguide
            School.createSguide(schoolId,guide.id,email,title,type,dept,about,phone,fax,address,skype,function(err,sguide){
              if(err) next(err);
              else next(null,sguide)
            })
          }else{
            //not found, so create new guide
            School.createGuide(fname,lname,email,type,title,dept,phone,fax,address,skype,about, function(err,guide){
              if(err) next(err);
              else{
                //then create sguide
                School.createSguide(schoolId,guide.id,email,title,type,dept,about,phone,fax,address,skype,function(err,sguide){
                  if(err) next(err);
                  else next(null,sguide);
                })
              }
            });
          }
        });
      }
    });
  };

  School.createGuide = function(fname,lname,email,title,type,tagline,phone,fax,address,skype,about,next){
    var contact = {};
    contact['email'] = email;
    contact['phone'] = phone || '';
    contact['fax'] = fax || '';
    contact['address'] = address || '';
    contact['skype'] = skype || '';
    School.app.models.guide.create({
      'code': "guide-" + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
      'type': type,
      'title': title,
      'fname': fname,
      'lname': lname,
      'tagline': tagline,
      'contact': contact,
      'about': about
    }, function(err,guide){
      if(err) next(err);
      else next(null, guide);
    });
  }

  School.createSguide = function(schoolId,guideId,email,title,type,dept,about,phone,fax,address,skype,next){
    var contact = {};
    contact['email'] = email;
    contact['phone'] = phone || '';
    contact['fax'] = fax || '';
    contact['address'] = address || '';
    contact['skype'] = skype || '';
    School.app.models.sguide.create({
      'code': "sguide-" + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
      'title': title,
      'type': type,
      'schoolId': schoolId,
      'guideId': guideId,
      'dept': dept,
      'about': about,
      'contact': contact
    }, function(err,sguide){
      if(err) next(err);
      else next(null,sguide);
    });
  }
*/
  // register a post method for procourses
  School.remoteMethod(
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

  School.prototype.Procourse = function(title,type,stream,courseId,next){
    var schoolId = this.id;
    if(courseId){
      //find course by courseId
      School.app.models.course.findById(courseId,function(err,course){
        if(err) next(err);
        if(course){
          //found course create procourse
          School.app.models.procourse.createProcourse(title,type,courseId,'school',schoolId,function(err,procourse){
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
      School.app.models.course.findOne({
        'where': {'title': title}
      }, function(err,course){
        if(err) next(err);
        else if(course){
          //found course create procourse
          School.app.models.procourse.createProcourse(title,type,course.id,'school',schoolId,function(err,procourse){
            if(err) next(err);
            else next(null,procourse);
          });
        }else{
          //not found create course
          School.app.models.course.createCourse(title,type,stream,function(err,course){
            if(err) next(err);
            else{
              //create procourse
              School.app.models.procourse.createProcourse(title,type,course.id,'school',schoolId,function(err,procourse){
                if(err) next(err);
                else next(null,procourse);
              });
            }
          });
        }
      });
    }
  }

  // register a school details remote method
  School.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'school details'
    }
  );

  School.prototype.details = function(next){
    var schoolFilter = School.app.get('schoolFilter');
    School.findById(this.id,schoolFilter, function(err,school){
      if(err) next(err);
      else next(null,school);
    });
  };
  
  // school signup method
  School.remoteMethod(
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
      description: 'signup as a school'
    }
  );

  School.signup = function(title,type,email,password,next){
    //first create a user
    School.app.models.User.create({
      'username': email,
      'email': email,
      'password': password
    }, function(err,user){
      if(err) next(err);
      else if(user){
        //if user created then create school
        School.create({
          'title': title,
          'type': type,
          'code': "school-" + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
          'userId': user.id
        }, function(err,school){
          if(err) next(err);
          else {
            var res = {};
            res.school = school;
            res.user = user;
            next(null,res);
          }
        });
      }
    });
  }

  // register a school search remote method
  School.remoteMethod(
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
      description: 'school search'
    }
  );

  School.search = function(query,filter,facet/*title,code,skills,rating,type*/,limit,next){
    //solr search
    var start = 0; var rows = 10;
    var q = query || '*';
    if(limit){
      lObj = limit.split(":", 2);
      start = lObj[0];
      rows = lObj[1];
    }
    var client = solr.createClient(School.app.get("sSolrParams"));
    var query = client.createQuery().q(q).start(start).rows(rows);
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
    /*var schoolSearch = School.app.get('schoolSearch');
    var rule = {}; 
    if(title){
      var title = new RegExp('.*'+title+'.*', "i"); // case-insensitive RegExp search 
      rule['title'] = { 'like': title};
    }
    if(code) rule['code'] = {'regexp': code};
    if(skills.length) rule['skills.code'] = {'inq':skills};
    if(type.length) rule['type'] = {'inq':type};
    //TODO: filter on the basis of rating

    School.find({
      'where': rule,
      'fields': schoolSearch.fields,
      'limit': limit
    }, function(err,school){
      if(err) next(err);
      else next(null,school);
    });*/
  };

  // register a school lookup remote method
  School.remoteMethod(
    'lookup',
    {
      http: {path: '/lookup', verb: 'get'},
      accepts: [
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: false},
        {arg: 'limit', type: 'number', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'school lookup'
    }
  );

  School.lookup = function(title,type,limit,next){
    var sObj = [];
    var scoreService = School.app.dataSources.scoreService;
    scoreService.create('schools/lookup',{'key':title},'',function(err,schools){
      if(err) next(err);
      else {
        schools.forEach(function(school){
          //split & trim respose
          var title = school.split('|')[0].trim();
          var location = school.split('|')[1].trim();
          sObj.push({title,location});
        })
        next(null,sObj);
      }
    });
  };

  // add skills
  School.remoteMethod(
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

  School.prototype.setSkills = function(skills, next){
    School.findById(this.id, function(err,school){
      if(err) next(err);
      else{
        if(skills[0].skills) //only for Front End response
          skills = skills[0].skills;
        school.updateAttributes({
          'skills': skills
        }, function(err,skills){
          if(err) next(err);
          else next(null,skills);
        });
      }
    });
  }

  // register a school uploadmedia remote method
  School.remoteMethod(
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

  School.prototype.uploadMedia = function(req,next){
    var schoolId = this.id;
    var baseUrl = 'http://'+School.app.get('host')+':'+ School.app.get('port')+'/api/containers/';
    School.findById(schoolId, function(err,school){
      if(err) next(err);
      else if(school){
        var galObj = school.gallery || {};
        School.app.models.business.upload(schoolId,req, function(err,file){
          if(err) next(err);
          else{
            //set gallery object
            if(file.files.pic){
              galObj['pic'] = baseUrl+file.files.pic[0].container+'/download/'+file.files.pic[0].name;
            }
            if(file.files.banner){
              galObj['banner'] = baseUrl+file.files.banner[0].container+'/download/'+file.files.banner[0].name;
            }
            //update gallery
            school.updateAttributes({
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
  School.remoteMethod(  
    'index',
    {
      http: {path: '/index', verb: 'post'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'indexes a school of given id'
    }
  );

  School.prototype.index = function(next){
    var sObj = {};
    var client = solr.createClient(School.app.get("sSolrParams"));
    var pic = '';var location = ''; var skills = [];
    var c_type = [];
    var c_stream = [];
    var pc_type = [];
    var pc_title = [];

    School.findById(this.id,{
      'include': ['courses','procourses']
    }, function(err,s){
      if(err) next(err);
      else if(s){
        if(s.gallery && s.gallery.pic)
          pic = s.gallery.pic;
        if(s.location)
          location = [s.location.city,s.location.state,s.location.country];

        //skills
        s.skills.forEach(function(skill){
          skills.push(skill.code);
        })
        //course type & stream
        s.courses().forEach(function(c){
          if(c.stream) c_stream.push(c.stream);
          c_type.push(c.type);
        })

        //procourse type & title
        s.procourses().forEach(function(pc){
          pc_type.push(pc.type);
          pc_title.push(pc.title);
        })

        sObj = {'id':s.id,'title':s.title,'code':s.code,'type':s.type,'brief':s.brief,'detail':s.detail,
            'pic': pic,'status':s.status,'location':location,'skills':skills,'c_type':c_type,'c_stream':c_stream,
            'pc_type':pc_type,'pc_title':pc_title};

        //indexing solr
        client.add(sObj, function(err,done){
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
  School.remoteMethod(
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

  School.prototype.createInteraction = function(data,next){
    //TODO: validate relations
    School.app.models.interaction.create(data, function(err,interaction){
      if(err) next(err)
      else next(null,interaction)
    })
  }

  School.disableRemoteMethod('find',true);
  School.disableRemoteMethod('upsert',true);
  School.disableRemoteMethod('create',true);
  School.disableRemoteMethod('exists',true);
  School.disableRemoteMethod('updateAll',true);
  School.disableRemoteMethod('findOne',true);
  School.disableRemoteMethod('count',true);
  School.disableRemoteMethod('deleteById',true);
  School.disableRemoteMethod('__count__skill', false);
  //School.disableRemoteMethod('__get__profile',false);
  School.disableRemoteMethod('__destroy__profile',false);
  School.disableRemoteMethod('__delete__activity',false);
  School.disableRemoteMethod('__destroyById__activity', false);
  School.disableRemoteMethod('__count__activity', false);

  School.disableRemoteMethod('__count__breviews',false);
  School.disableRemoteMethod('__get__breviews',false);
  School.disableRemoteMethod('__create__breviews',false);
  School.disableRemoteMethod('__delete__breviews',false);
  School.disableRemoteMethod('__findById__breviews',false);
  School.disableRemoteMethod('__updateById__breviews',false);
  School.disableRemoteMethod('__destroyById__breviews',false);

  School.disableRemoteMethod('__create__courses', false);
  School.disableRemoteMethod('__create__procourses', false);
  School.disableRemoteMethod('__delete__courses',false);
  School.disableRemoteMethod('__updateById__courses', false);
  School.disableRemoteMethod('__destroyById__courses', false);
  School.disableRemoteMethod('__count__courses', false);

  School.disableRemoteMethod('__exists__courses',false);
  School.disableRemoteMethod('__link__courses',false);
  School.disableRemoteMethod('__unlink__courses',false);

  School.disableRemoteMethod('__count__creviews',false);
  School.disableRemoteMethod('__get__creviews',false);
  School.disableRemoteMethod('__create__creviews',false);
  School.disableRemoteMethod('__delete__creviews',false);
  School.disableRemoteMethod('__findById__creviews',false);
  School.disableRemoteMethod('__updateById__creviews',false);
  School.disableRemoteMethod('__destroyById__creviews',false);

  School.disableRemoteMethod('__count__greviews',false);
  School.disableRemoteMethod('__get__greviews',false);
  School.disableRemoteMethod('__create__greviews',false);
  School.disableRemoteMethod('__delete__greviews',false);
  School.disableRemoteMethod('__findById__greviews',false);
  School.disableRemoteMethod('__updateById__greviews',false);
  School.disableRemoteMethod('__destroyById__greviews',false);
  
  School.disableRemoteMethod('__create__guides',false);
  School.disableRemoteMethod('__delete__guides',false);

  School.disableRemoteMethod('__exists__guides',false);
  School.disableRemoteMethod('__link__guides',false);
  School.disableRemoteMethod('__unlink__guides',false);
  School.disableRemoteMethod('__destroyById__guides', false);
  School.disableRemoteMethod('__count__guides', false);
  //School.disableRemoteMethod('__create__sguides',false);
  School.disableRemoteMethod('__count__sguides',false);
  School.disableRemoteMethod('__create__history', false);
  School.disableRemoteMethod('__delete__history',false);
  School.disableRemoteMethod('__get__history',false);
  School.disableRemoteMethod('__findById__history',false);
  School.disableRemoteMethod('__updateById__history', false);
  School.disableRemoteMethod('__destroyById__history', false);
  School.disableRemoteMethod('__count__history', false);

  School.disableRemoteMethod('__create__interactions',false);
  School.disableRemoteMethod('__delete__interactions',false);
  School.disableRemoteMethod('__updateById__interactions',false);
  School.disableRemoteMethod('__destroyById__interactions', false);
  School.disableRemoteMethod('__count__interactions', false);

  School.disableRemoteMethod('__create__stuappl', false);
  School.disableRemoteMethod('__delete__stuappl',false);
  School.disableRemoteMethod('__updateById__stuappl',false);
  School.disableRemoteMethod('__destroyById__stuappl', false);
  School.disableRemoteMethod('__count__stuappl', false);

  School.disableRemoteMethod('__create__student', false);
  School.disableRemoteMethod('__delete__student',false);
  School.disableRemoteMethod('__updateById__student',false);
  School.disableRemoteMethod('__destroyById__student', false);
  School.disableRemoteMethod('__count__student', false);

  School.disableRemoteMethod('__delete__ireviews',false);
  School.disableRemoteMethod('__destroyById__ireviews', false);
  School.disableRemoteMethod('__count__ireviews', false);
  School.disableRemoteMethod('__delete__procourses',false);
  School.disableRemoteMethod('__destroyById__procourses', false);
  School.disableRemoteMethod('__count__procourses', false);
  School.disableRemoteMethod('__create__reviews',false);
  School.disableRemoteMethod('__delete__reviews',false);
  School.disableRemoteMethod('__updateById__reviews', false);
  School.disableRemoteMethod('__destroyById__reviews', false);
  School.disableRemoteMethod('__count__reviews', false);
  School.disableRemoteMethod('createChangeStream',true);
};
