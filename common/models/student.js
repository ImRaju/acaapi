module.exports = function(Student) {
  //create student method
  Student.createStudent = function(title,type,procourseId,memberId,providerType,providerId,next){
    Student.create({
      'title': title,
      'type': type,
      'memberId': memberId,
      'procourseId': procourseId,
      'providerType': providerType,
      'providerId': providerId
    }, function(err,student){
      if(err) next(err);
      else next(null,student);
    });
  }
  /*
  //student model is not exposed on API
  // register a student detail remote method
  Student.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'student details'
    }
  );

  Student.prototype.details = function(next){
    Student.findById(this.id, function(err,student){
      if(err) next(err);
      else next(null,student);
    });
  };

  // register a student search remote method
  Student.remoteMethod(
    'search',
    {
      http: {path: '/search', verb: 'get'},
      accepts: [
        {arg: 'type', type: 'string', required: false},
        {arg: 'limit', type: 'number', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'student search'
    }
  );

  Student.search = function(type,limit,next){
    Student.find({
      'where': {'type': type},
      'limit': limit
    }, function(err,student){
      if(err) next(err);
      else next(null,student);
    });
  };

  Student.disableRemoteMethod('find',true);
  Student.disableRemoteMethod('upsert',true);
  Student.disableRemoteMethod('create',true);
  Student.disableRemoteMethod('exists',true);
  Student.disableRemoteMethod('updateAll',true);
  Student.disableRemoteMethod('findOne',true);
  Student.disableRemoteMethod('count',true);
  Student.disableRemoteMethod('deleteById',true);
  Student.disableRemoteMethod('__delete__interactions',false);
  Student.disableRemoteMethod('__destroyById__interactions', false);
  Student.disableRemoteMethod('__count__interactions', false);
  //Student.disableRemoteMethod('__get__profile',false);
  Student.disableRemoteMethod('__count__skill', false);
  Student.disableRemoteMethod('__destroy__profile',false);
  Student.disableRemoteMethod('createChangeStream',true);*/
};
