module.exports = function(Interaction) {
  Interaction.observe('before save', function(ctx,next){
    if (ctx.currentInstance) {
      var bObj = {};
      var ci   = ctx.currentInstance;
      //initialize before object
      bObj['source'] = ci.source;
      bObj['type'] = ci.type;
      bObj['reasonType'] = ci.reasonType;
    }
    ctx.hookState.before = bObj;
    next();
  });

  Interaction.observe('after save', function(ctx,next){
    //interaction history
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
        if(err) console.log('interaction history error ',err);
      })
    next();
  });

  // register a Interaction detail remote method
  Interaction.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'Interaction details'
    }
  );

  Interaction.prototype.details = function(next){
    Interaction.findById(this.id, function(err,Interaction){
      if(err) next(err);
      else next(null,Interaction);
    });
  };

  // register a Interaction search remote method
  Interaction.remoteMethod(
    'search',
    {
      http: {path: '/search', verb: 'get'},
      accepts: [
        {arg: 'source', type: 'string', required: false},
        {arg: 'code', type: 'string', required: false},
        {arg: 'type', type: 'string', required: false},
        {arg: 'limit', type: 'number', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'Interaction search'
    }
  );

  Interaction.search = function(source,code,type,limit,next){
    var rule = {};
    if(source) rule['source'] = {'regexp': source};
    if(code) rule['code'] = {'regexp': code};
    if(type) rule['type'] = type;

    Interaction.find({
      'where': rule,
      'limit': limit
    }, function(err,Interaction){
      if(err) next(err);
      else next(null,Interaction);
    });
  };
  Interaction.disableRemoteMethod('find', true);
  Interaction.disableRemoteMethod('upsert', true);
  Interaction.disableRemoteMethod('count', true);
  Interaction.disableRemoteMethod('exists', true);
  Interaction.disableRemoteMethod('updateAll', true);
  Interaction.disableRemoteMethod('findOne', true);
  Interaction.disableRemoteMethod('deleteById',true);
  Interaction.disableRemoteMethod('__get__activity',false);
  //Interaction.disableRemoteMethod('__create__activity',false);
  Interaction.disableRemoteMethod('__delete__activity',false);
  Interaction.disableRemoteMethod('__findById__activity', false);
  Interaction.disableRemoteMethod('__updateById__activity', false);
  Interaction.disableRemoteMethod('__updateById__activity', false);
  Interaction.disableRemoteMethod('__count__activity', false);
  Interaction.disableRemoteMethod('__destroyById__activity', false);
  Interaction.disableRemoteMethod("__create__history",false);
  Interaction.disableRemoteMethod("__updateById__history",false);
  Interaction.disableRemoteMethod('__count__history',false);
  //Interaction.disableRemoteMethod('__get__history',false);
  Interaction.disableRemoteMethod('__create__history',false);
  Interaction.disableRemoteMethod('__delete__history',false);
  Interaction.disableRemoteMethod('__findById__history',false);
  Interaction.disableRemoteMethod('__updateById__history',false);
  Interaction.disableRemoteMethod('__destroyById__history',false);
  Interaction.disableRemoteMethod('__delete__messages',false);
  Interaction.disableRemoteMethod('__destroyById__messages', false);
  Interaction.disableRemoteMethod('__count__messages', false);
  Interaction.disableRemoteMethod('__get__reviews',false);
  Interaction.disableRemoteMethod('__create__reviews',false);
  Interaction.disableRemoteMethod('__delete__reviews',false);
  Interaction.disableRemoteMethod('__findById__reviews', false);
  Interaction.disableRemoteMethod('__updateById__reviews', false);
  Interaction.disableRemoteMethod('__updateById__reviews', false);
  Interaction.disableRemoteMethod('__count__reviews', false);
  Interaction.disableRemoteMethod('__destroyById__reviews', false)
  Interaction.disableRemoteMethod('createChangeStream', true);
};
