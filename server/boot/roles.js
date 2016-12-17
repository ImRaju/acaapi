
module.exports = function(app) {
  var User = app.models.User;
  var Member = app.models.Member;
  var Business = app.models.Business;
  var Guide = app.models.Guide;
  var School = app.models.School;
  var Bizjob = app.models.Bizjob;
  var Role = app.models.Role;
  var RoleMapping = app.models.RoleMapping;

  /*
  User.create([
    {username: 'cadmin', email: 'pradeep.sharma@gmail.com', password: 'pradeep'},
    ], function(err, users) {
      if (err) throw err;
 
      //create the admin role
      Role.create({
        name: 'admin'
      }, function(err, role) {
        if (err) throw err;
 
        //make pradeep an admin
        role.principals.create({
          principalType: RoleMapping.USER,
          principalId: users[0].id
        }, function(err, principal) {
          if(err) throw err;
        });
      });
    });
    */

  //define all types of role
  var roles = ['business', 'guide', 'member', 'school'];
  roles.forEach(function(role){
    Role.findOrCreate(
      {'where': {'name': role}}, // find
      {'name': role}, // create
      function(err,role){
        if(err)
          console.error('error running findOrCreate('+role+')', err);
      }
    )
  })
/*
  Role.registerResolver('member', function(role, context, cb) {
    function reject(err) {
      if(err) {
        return cb(err);
      }
      cb(null, false);
    }
    var userId = context.accessToken.userId;
    if (!userId) {
      return reject(); // do not allow anonymous users
    }
    // check if userId is in member table
    Member.findOne({'where': {'userId': userId}}, function(err, member) {
      if(err || !member) {
        reject(err);
      }
      else{
        cb(null, true);
      }
    });
  });

  //Define business role
  Role.registerResolver('business', function(role, context, cb){
    function reject(err) {
      if(err) {
        return cb(err);
      }
      cb(null, false);
    }
    var userId = context.accessToken.userId;
    if(!userId) {
      reject(err); // do not allow anonymous users
    }
    // check if userId is in business table
    Business.findOne({'where': {'userId':userId}}, function(err, business){
      if(err || !business) {
        reject(err);
      }
      else {
        cb(null, true);
      }
    })
  });

  //Define guide role
  Role.registerResolver('guide', function(role, context, cb){
    function reject(err) {
      if(err) {
        return cb(err);
      }
      cb(null, false);
    }
    var userId = context.accessToken.userId;
    if(!userId) {
      reject(err); // do not allow anonymous users
    }
    // check if userId is in guide table
    Guide.findOne({'where': {'userId':userId}}, function(err, guide){
      if(err || !guide) {
        reject(err);
      }
      else {
        cb(null, true);
      }
    })
  });

  //Define school role
  Role.registerResolver('school', function(role, context, cb){
    function reject(err) {
      if(err) {
        return cb(err);
      }
      cb(null, false);
    }
    var userId = context.accessToken.userId;
    if(!userId) {
      reject(err); // do not allow anonymous users
    }
    // check if userId is in school table
    School.findOne({'where': {'userId':userId}}, function(err, school){
      if(err || !school) {
        reject(err);
      }
      else {
        cb(null, true);
      }
    })
  });
*/
};
