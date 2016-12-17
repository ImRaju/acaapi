module.exports = function(Procourse) {
  //create procourse method
  Procourse.createProcourse = function(title,type,courseId,providerType,providerId,next){
    Procourse.create({
      'code': 'procourse-' + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
      'title': title,
      'type': type,
      'courseId': courseId,
      'providerType': providerType,
      'providerId': providerId
    }, function(err,procourse){
      if(err) next(err);
      else next(null,procourse);
    });
  }

  // register a procourse detail remote method
  Procourse.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'procourse details'
    }
  );

  Procourse.prototype.details = function(next){
    var procourseFilter = Procourse.app.get('procourseFilter');
    Procourse.findById(this.id, procourseFilter, function(err,pcourse){
      if(err) next(err);
      else next(null,pcourse);
    });
  };

  // register a procourse search remote method
  Procourse.remoteMethod(
    'search',
    {
      http: {path: '/search', verb: 'get'},
      accepts: [
        {arg: 'title', type: 'string', required: false},
        {arg: 'code', type: 'string', required: false},
        {arg: 'skills', type: 'array', description:'array of skills', required: false},
        {arg: 'rating', type: 'number', description:'decimal format eg- min.max',required: false},
        {arg: 'type', type: 'array', description:'array of type', required: false},
        {arg: 'limit', type: 'number', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'procourse search'
    }
  );

  Procourse.search = function(title,code,skills,rating,type,limit,next){
    var pcourseSearch = Procourse.app.get('pcourseSearch');
    var rule = {}; 
    if(title){
      var title = new RegExp('.*'+title+'.*', "i"); /* case-insensitive RegExp search */
      rule['title'] = { 'like': title};
    }
    if(code) rule['code'] = {'regexp': code};
    if(skills.length) rule['skills.code'] = {'inq':skills};
    if(type.length) rule['type'] = {'inq':type};
    //TODO: filter on the basis of rating  

    Procourse.find({
      'where': rule,
      'fields': pcourseSearch.fields,
      'limit': limit
    }, function(err,pcourse){
      if(err) next(err);
      else next(null,pcourse);
    });
  };

  // add lesson
  Procourse.remoteMethod(
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

  Procourse.prototype.setLesson = function(lesson, next){
    Procourse.findById(this.id, function(err,pcourse){
      if(err) next(err);
      else{
        if(lesson[0].lesson) //only for Front End response
          lesson = lesson[0].lesson;
        pcourse.updateAttributes({
          'lesson': lesson
        }, function(err,lesson){
          if(err) next(err);
          else next(null,lesson);
        });
      }
    });
  }

  // add skills
  Procourse.remoteMethod(
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

  Procourse.prototype.setSkills = function(skills, next){
    Procourse.findById(this.id, function(err,pcourse){
      if(err) next(err);
      else{
        if(skills[0].skills) //only for Front End response
          skills = skills[0].skills;
        pcourse.updateAttributes({
          'skills': skills
        }, function(err,skills){
          if(err) next(err);
          else next(null,skills);
        });
      }
    });
  }

  Procourse.disableRemoteMethod("find", true);
  Procourse.disableRemoteMethod("upsert", true);
  Procourse.disableRemoteMethod("create", true);
  Procourse.disableRemoteMethod('findById',true);
  Procourse.disableRemoteMethod('deleteById',true);
  Procourse.disableRemoteMethod('updateAll',true);
  Procourse.disableRemoteMethod('updateAttributes', false);
  Procourse.disableRemoteMethod("count", true);
  Procourse.disableRemoteMethod("exists", true);
  Procourse.disableRemoteMethod("findOne", true);
  Procourse.disableRemoteMethod('deleteById',true);
  Procourse.disableRemoteMethod('__delete__activities',false);
  Procourse.disableRemoteMethod('__destroyById__activities', false);
  Procourse.disableRemoteMethod('__count__activities', false);
  Procourse.disableRemoteMethod('__get__reviews',false);
  Procourse.disableRemoteMethod('__create__reviews',false);
  Procourse.disableRemoteMethod('__delete__reviews',false);
  Procourse.disableRemoteMethod('__findById__reviews', false);
  Procourse.disableRemoteMethod('__updateById__reviews', false);
  Procourse.disableRemoteMethod('__updateById__reviews', false);
  Procourse.disableRemoteMethod('__count__reviews', false);
  Procourse.disableRemoteMethod('__destroyById__reviews', false);
  Procourse.disableRemoteMethod('__get__profile',false);
  Procourse.disableRemoteMethod('__destroy__profile',false);
  Procourse.disableRemoteMethod('__create__interactions',false);
  Procourse.disableRemoteMethod('__delete__interactions',false);
  Procourse.disableRemoteMethod('__updateById__interactions',false);
  Procourse.disableRemoteMethod('__destroyById__interactions', false);
  Procourse.disableRemoteMethod('createChangeStream', true);
};
