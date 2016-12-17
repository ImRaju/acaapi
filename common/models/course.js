var solr = require('solr-client');

module.exports = function(Course) {
  Course.observe('before save', function(ctx,next){
    if (ctx.currentInstance) {
      var bObj = {};
      var ci   = ctx.currentInstance;
      //initialize before object
      bObj['code'] = ci.code;
      bObj['title'] = ci.title;
      bObj['type'] = ci.type;
      bObj['brief'] = ci.brief;
      bObj['detail'] = ci.detail;
      bObj['meta'] = ci.meta;
      bObj['lessons'] = ci.lessons;
      bObj['skills'] = ci.skills;
    }
    ctx.hookState.before = bObj;
    next();
  });

  Course.observe('after save', function(ctx,next){
    //course history
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
        if(err) console.log('Course history error ',err);
      })
    next();
  });

  //create course method
  Course.createCourse = function(title,type,stream,next){
    Course.create({
      'code': 'course-' + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
      'title': title,
      'type': type,
      'stream': stream
    }, function(err,course){
      if(err) next(err);
      else next(null,course);
    });
  }
  
  // register a course detail remote method
  Course.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'course details'
    }
  );

  Course.prototype.details = function(next){
    var cId = this.id;
    Course.findById(cId, function(err,course){
      if(err) next(err);
      else if(course){
        //include procourses
        Course.app.models.procourse.find({
          'where': {'courseId':cId},
          'fields': ['title','type','location','providerType','providerId','id']
        }, function(err,pcourses){
          if(err) next(err);
          else {
            //include providers
            var promises = pcourses.map(function(pc){
              if(pc.providerType == 'guide'){
                return Course.app.models.guide.findById(pc.providerId,{
                  'fields': ['title','fname','lname','id']
                }).then(function(provider){
                  if(err) throw err;
                  else {
                    pc['provider'] = provider;
                    return pc;
                  }
                })
              }else if(pc.providerType == 'school'){
                return Course.app.models.school.findById(pc.providerId,{
                  'fields': ['title','id']
                }).then(function(provider){
                  if(err) throw err;
                  else {
                    pc['provider'] = provider;
                    return pc;
                  }
                })
              }
            });
            Promise.all(promises).then(function(response){
              course['procourse'] = response;
              return next(null,course);
            },function(err){
              return next(err);
            });
          }
        })
      }
    });
  };

  // register a course search remote method
  Course.remoteMethod(
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
        {arg: 'type', type: 'string', required: false},
        {arg: 'limit', type: 'number', required: false},*/
      ],
      returns: {root: true, type: 'object'},
      description: 'course search'
    }
  );

  Course.search = function(query,filter,facet/*title,code,type*/,limit,next){
    //solr search
    var start = 0; var rows = 10;
    var q = query || '*'
    if(limit){
      lObj = limit.split(":", 2);
      start = lObj[0];
      rows = lObj[1];
    }
    var client = solr.createClient(Course.app.get("cSolrParams"));
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
    /*var rule = {};
    if(title) rule['title'] = {'regexp': title};
    if(code) rule['code'] = {'regexp': code};
    if(type) rule['type'] = type;

    Course.find({
      'where': rule,
      'limit': limit
    }, function(err,course){
      if(err) next(err);
      else next(null,course);
    });*/
  };

  // add lesson
  Course.remoteMethod(
    'setLesson',
    {
      http: {path: '/setLesson', verb: 'post'},
      accepts:[
        { arg: 'lesson', type: ['lessonbit'], http: { source: 'body' }}
      ],
      isStatic: false,
      returns: {arg: "data", type: "lessonbit", root: true},
      description: 'set lesson'
    }
  );

  Course.prototype.setLesson = function(lesson, next){
    Course.findById(this.id, function(err,course){
      if(err) next(err);
      else{
        if(lesson[0].lesson) //only for Front End response
          lesson = lesson[0].lesson;
        course.updateAttributes({
          'lesson': lesson
        }, function(err,lesson){
          if(err) next(err);
          else next(null,lesson);
        });
      }
    });
  }

  // add skills
  Course.remoteMethod(
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

  Course.prototype.setSkills = function(skills, next){
    Course.findById(this.id, function(err,course){
      if(err) next(err);
      else{
        if(skills[0].skills) //only for Front End response
          skills = skills[0].skills;
        course.updateAttributes({
          'skills': skills
        }, function(err,skills){
          if(err) next(err);
          else next(null,skills);
        });
      }
    });
  }

  // register a course lookup remote method
  Course.remoteMethod(
    'lookup',
    {
      http: {path: '/lookup', verb: 'get'},
      accepts: [
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: false},
        {arg: 'limit', type: 'number', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'course lookup'
    }
  );

  Course.lookup = function(title,type,limit,next){
    var scoreService = Course.app.dataSources.scoreService;
    scoreService.create('courses/lookup',{'key':title},'',function(err,courses){
      if(err) next(err);
      else next(null,courses);
    });
  };

  // Register a 'index' remote method
  Course.remoteMethod(  
    'index',
    {
      http: {path: '/index', verb: 'post'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'indexes a course of given id'
    }
  );

  Course.prototype.index = function(next){
    var cObj = {};
    var client = solr.createClient(Course.app.get("cSolrParams"));
    var skills = [];
    var lesson = [];

    Course.findById(this.id, function(err,c){
      if(err) next(err);
      else if(c){
        //skills
        if(c.skills){
          c.skills.forEach(function(skill){
            skills.push(skill.code);
          })
        }

        //lesson
        if(c.lesson){
          c.lesson.forEach(function(l){
            lesson.push(l.title);
          })
        }

        cObj = {'id':c.id,'title':c.title,'code':c.code,'type':c.type,'brief':c.brief,'detail':c.detail,
          'stream':c.stream,'skills':skills,'lesson':lesson};

        //indexing solr
        client.add(cObj, function(err,done){
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

  Course.disableRemoteMethod('find', true);
  Course.disableRemoteMethod('upsert', true);
  Course.disableRemoteMethod('count', true);
  Course.disableRemoteMethod('exists', true);
  Course.disableRemoteMethod('updateAll', true);
  Course.disableRemoteMethod('findOne', true);
  Course.disableRemoteMethod('findById', true);
  Course.disableRemoteMethod('deleteById',true);
  Course.disableRemoteMethod('__destroy__metaobj',false);
  Course.disableRemoteMethod('__count__history',false);
  Course.disableRemoteMethod('__get__history',false);
  Course.disableRemoteMethod('__create__history',false);
  Course.disableRemoteMethod('__delete__history',false);
  Course.disableRemoteMethod('__findById__history',false);
  Course.disableRemoteMethod('__updateById__history',false);
  Course.disableRemoteMethod('__destroyById__history',false);
  Course.disableRemoteMethod('__count__lesson',false);
  Course.disableRemoteMethod('__get__lesson',false);
  Course.disableRemoteMethod('__delete__lesson',false);
  Course.disableRemoteMethod('__findById__lesson',false);
  Course.disableRemoteMethod('__destroyById__lesson',false);
  Course.disableRemoteMethod('__count__skill', false);
  Course.disableRemoteMethod('createChangeStream', true);
};
