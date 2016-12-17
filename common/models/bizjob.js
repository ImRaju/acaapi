module.exports = function (Bizjob) {
  Bizjob.observe('before save', function (ctx, next) {
    if (ctx.currentInstance) {
      var bObj = {};
      var ci = ctx.currentInstance;
      //initialize before object
      bObj['salarystructure'] = ci.salarystructure;
      bObj['recruitproc'] = ci.recruitproc;
      bObj['title'] = ci.title;
      bObj['location'] = ci.location;
    }
    ctx.hookState.before = bObj;
    next();
  });

  Bizjob.observe('after save', function (ctx, next) {
    //Bizjob history
    var before = ctx.hookState.before;
    var after = ctx.instance;
    ctx.instance.history.create(
      {
        'b': before,
        'a': after,
        'logdate': new Date,
        'status': 'default',
        'tag': 'default',
        'type': 'default'
      }, function (err, data) {
        if (err) console.log('Bizjob history error ', err);
      })
    next();
  });

  //create bizjob method
  Bizjob.createBizjob = function (title, type, jobId, businessId, next) {
    Bizjob.create({
      'code': 'bizjob-' + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
      'title': title,
      'type': type,
      'jobId': jobId,
      'businessId': businessId
    }, function (err, bizjob) {
      if (err) next(err);
      else next(null, bizjob);
    });
  }

  // add skills
  Bizjob.remoteMethod(
    'setSkills',
    {
      http: {path: '/setSkills', verb: 'post'},
      accepts: [
        {arg: 'skills', type: ['skillbit'], http: {source: 'body'}}
      ],
      isStatic: false,
      returns: {arg: "data", type: "skillbit", root: true},
      description: 'set skills'
    }
  );

  Bizjob.prototype.setSkills = function (skills, next) {
    Bizjob.findById(this.id, function (err, bizjob) {
      if (err) next(err);
      else {
        if (skills[0].skills) //only for Front End response
          skills = skills[0].skills;
        bizjob.updateAttributes({
          'skills': skills
        }, function (err, skills) {
          if (err) next(err);
          else next(null, skills);
        });
      }
    });
  }

  // register a bizjob detail remote method
  Bizjob.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'bizjob details'
    }
  );

  Bizjob.prototype.details = function (next) {
    var bizjobFilter = Bizjob.app.get('bizjobFilter');
    Bizjob.findById(this.id, bizjobFilter, function (err, bzj) {
      if (err) next(err);
      else next(null, bzj);
    });
  };

  // register a bizjob search remote method
  Bizjob.remoteMethod(
    'search',
    {
      http: {path: '/search', verb: 'get'},
      accepts: [
        {arg: 'title', type: 'string', required: false},
        {arg: 'code', type: 'string', required: false},
        {arg: 'skills', type: 'array', description: 'array of skills', required: false},
        {arg: 'rating', type: 'number', description: 'decimal format eg- min.max', required: false},
        {arg: 'type', type: 'array', description: 'array of type', required: false},
        {arg: 'limit', type: 'number', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'bizjob search'
    }
  );

  Bizjob.search = function (title, code, skills, rating, type, limit, next) {
    var bzjSearch = Bizjob.app.get('bzjSearch');
    var rule = {};
    if (title) {
      var title = new RegExp('.*' + title + '.*', "i");
      /* case-insensitive RegExp search */
      rule['title'] = {'like': title};
    }
    if (code) rule['code'] = {'regexp': code};
    if (skills.length) rule['skills.code'] = {'inq': skills};
    if (type.length) rule['type'] = {'inq': type};
    //TODO: filter on the basis of rating rating

    Bizjob.find({
      'where': rule,
      'fields': bzjSearch.fields,
      'limit': limit
    }, function (err, bzj) {
      if (err) next(err);
      else next(null, bzj);
    });
  };

  Bizjob.disableRemoteMethod('find', true);
  Bizjob.disableRemoteMethod('upsert', true);
  Bizjob.disableRemoteMethod('create', true);
  Bizjob.disableRemoteMethod('findById', true);
  Bizjob.disableRemoteMethod('updateAttributes', false);
  Bizjob.disableRemoteMethod('updateAll', true);
  Bizjob.disableRemoteMethod('deleteById', true);
  Bizjob.disableRemoteMethod('__get__profile', false);
  //Bizjob.disableRemoteMethod('__create__profile',false);
  //Bizjob.disableRemoteMethod('__update__profile',false);
  Bizjob.disableRemoteMethod('__count__skill', false);
  Bizjob.disableRemoteMethod('__destroy__profile', false);
  Bizjob.disableRemoteMethod('count', true);
  Bizjob.disableRemoteMethod('exists', true);
  Bizjob.disableRemoteMethod('findOne', true);
  Bizjob.disableRemoteMethod('__get__activity', false);
  Bizjob.disableRemoteMethod('__create__activity', false);
  Bizjob.disableRemoteMethod('__delete__activity', false);
  Bizjob.disableRemoteMethod('__findById__activity', false);
  Bizjob.disableRemoteMethod('__updateById__activity', false);
  Bizjob.disableRemoteMethod('__updateById__activity', false);
  Bizjob.disableRemoteMethod('__count__activity', false);
  Bizjob.disableRemoteMethod('__destroyById__activity', false);
  Bizjob.disableRemoteMethod('__get__history', false);
  Bizjob.disableRemoteMethod('__create__history', false);
  Bizjob.disableRemoteMethod('__findById__history', false);
  Bizjob.disableRemoteMethod('__updateById__history', false);
  Bizjob.disableRemoteMethod('__delete__history', false);
  Bizjob.disableRemoteMethod('__destroyById__history', false);
  Bizjob.disableRemoteMethod('__count__history', false);
  Bizjob.disableRemoteMethod('__get__reviews', false);
  Bizjob.disableRemoteMethod('__create__reviews', false);
  Bizjob.disableRemoteMethod('__delete__reviews', false);
  Bizjob.disableRemoteMethod('__findById__reviews', false);
  Bizjob.disableRemoteMethod('__updateById__reviews', false);
  Bizjob.disableRemoteMethod('__updateById__reviews', false);
  Bizjob.disableRemoteMethod('__count__reviews', false);
  Bizjob.disableRemoteMethod('__destroyById__reviews', false);
  Bizjob.disableRemoteMethod('__create__interactions', false);
  Bizjob.disableRemoteMethod('__delete__interactions', false);
  Bizjob.disableRemoteMethod('__updateById__interactions', false);
  Bizjob.disableRemoteMethod('__destroyById__interactions', false);
  Bizjob.disableRemoteMethod('__count__interactions', false);
  Bizjob.disableRemoteMethod('createChangeStream', true);
};
