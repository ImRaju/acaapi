module.exports = function(Dimension) {
  // register a dimension detail remote method
  Dimension.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'dimension details'
    }
  );

  Dimension.prototype.details = function(next){
    Dimension.findById(this.id, function(err,dimension){
      if(err) next(err);
      else next(null,dimension);
    });
  };

  // register a dimension lookup remote method
  Dimension.remoteMethod(
    'lookup',
    {
      http: {path: '/lookup', verb: 'get'},
      accepts: [
        {arg: 'type', type: 'string', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'dimension lookup'
    }
  );

  Dimension.lookup = function(type,next){
    var filter = {};
    if(type) filter['type'] = type;
    Dimension.find({
      'where': filter,
      'fields': ['name','type','id']
    }, function(err,dimension){
      if(err) next(err);
      else next(null,dimension);
    });
  };

  Dimension.disableRemoteMethod('find', true);
  Dimension.disableRemoteMethod('upsert', true);
  Dimension.disableRemoteMethod('count', true);
  Dimension.disableRemoteMethod('exists', true);
  Dimension.disableRemoteMethod('exists', true);
  Dimension.disableRemoteMethod('updateAll', true);
  Dimension.disableRemoteMethod('findOne', true);
  Dimension.disableRemoteMethod('findById', true);
  Dimension.disableRemoteMethod('deleteById',true);
  Dimension.disableRemoteMethod('createChangeStream', true);
};
