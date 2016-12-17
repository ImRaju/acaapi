module.exports = function(Skill) {
  // register a skill detail remote method
  Skill.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'skill details'
    }
  );

  Skill.prototype.details = function(next){
    Skill.findById(this.id, function(err,skill){
      if(err) next(err);
      else next(null,skill);
    });
  };

  // register a skill lookup remote method
  Skill.remoteMethod(
    'lookup',
    {
      http: {path: '/lookup', verb: 'get'},
      accepts: [
        {arg: 'name', type: 'string', required: true},
        {arg: 'limit', type: 'number', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'skill lookup'
    }
  );

  Skill.lookup = function(name,limit,next){
    var scoreService = Skill.app.dataSources.scoreService;
    scoreService.create('skills/lookup',{'key':name},'',function(err,skills){
      if(err) next(err);
      else next(null,skills);
    });
  };


  Skill.disableRemoteMethod('find', true);
  Skill.disableRemoteMethod('upsert', true);
  Skill.disableRemoteMethod('count', true);
  Skill.disableRemoteMethod('exists', true);
  Skill.disableRemoteMethod('updateAll', true);
  Skill.disableRemoteMethod('findOne', true);
  Skill.disableRemoteMethod('findById', true);
  Skill.disableRemoteMethod('deleteById',true);
  Skill.disableRemoteMethod('createChangeStream', true);
};
