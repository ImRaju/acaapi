module.exports = function(Employee) {
  Employee.createEmployee = function(title,type,bizjobId,memberId,businessId,next){
    Employee.create({
      'title': title,
      'type': type,
      'bizjobId': bizjobId,
      'memberId': memberId,
      'businessId': businessId
    }, function(err,employee){
      if(err) next(err);
      else next(null,employee);
    });
  }
};
