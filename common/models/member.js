module.exports = function(Member) {
  Member.observe('after save', function(ctx, next) {
    //asign role
    if (ctx.instance) {
      if(ctx.isNewInstance) {
        var RoleMapping = Member.app.models.RoleMapping;
        var Role = Member.app.models.Role;
        Role.findOne({
          'where': {
            'name': 'member'
          }}, function(err,found){
            if(err) console.error('err in member role findOne', err);
            else if(found){
              RoleMapping.create({
                'principalType': RoleMapping.USER,
                'principalId': ctx.instance.userId,
                'roleId': found.id
              }, function(err, roleMapping) {
                if (err) console.error('err in creating roleMapping for member',err);
              })
            }
          }
        )
      }
    }
    next();
  });

  //email verification after signup
  Member.afterRemote('signup', function(context, member, next) {
    var vOptions = Member.app.get('emailVerificationOptions');
    var options = {
      type: vOptions.type,
      to: member.user.email,
      from: vOptions.from,
      subject: vOptions.subject,
      //template: path.resolve(__dirname, vOptions.template),
      redirect: vOptions.redirect,
      user: member.user
    };

    member.user.verify(options, function(err, response) {
      if (err) next(err);
      console.log('> verification email sent');
    });
    next();
  });

  //register a post method for employee
  Member.remoteMethod(
    'Employee',
    {
      http: {path: '/createEmployee', verb: 'post'},
      accepts: [
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: true},
        {arg: 'stream', type: 'string', required: true},
        {arg: 'jobtype', type: 'string', required: true},
        {arg: 'companytitle', type: 'string', required: false},
        {arg: 'companytype', type: 'string', required: false},
        {arg: 'jobId', type: 'string', required: false},
        {arg: 'bizjobId', type: 'string', required: false},
        {arg: 'businessId', type: 'string', required: false},
      ],
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'create employees'
    }
  );

  Member.prototype.Employee = function(title,type,stream,jobtype,companytitle,companytype,jobId,bizjobId,businessId,next){
    var memberId = this.id;
    if(bizjobId){
      //find bizjob
      Member.app.models.bizjob.findById(bizjobId, function(err,bizjob){
        if(err) next(err);
        else if(bizjob){
          //found bizjob create employee
          Member.app.models.employee.createEmployee(title,type,bizjob.Id,memberId,bizjob.businessId, function(err,employee){
            if(err) next(err);
            else next(null,employee);
          })
        }else{
          var err = new Error('bizjobId is not valid');
          err.statusCode = 404;
          next(err);
        }
      })
    }else if(businessId){
      //find business
      Member.app.models.business.findById(businessId,{'include':'bizjobs'}, function(err,business){
        if(err) next(err);
        else if(business && business.bizjobs.length){
          var found = false;
          //check bizjob is exist or not
          business.bizjobs().forEach(function(bjob){
            if(bjob.title == title){
              //TODO: multiple bizjob with same title throw error
              found = true;
              //exist, create employee
              Member.app.models.employee.createEmployee(title,type,bjob.Id,memberId,bjob.businessId, function(err,employee){
                if(err) next(err);
                else next(null,employee);
              })
            }
          })
          if(!found && jobId){
            Member.app.models.job.findById(jobId, function(err,job){
              if(err) next(err);
              else if(job){
                //found create bizjob
                Member.app.models.bizjob.createBizjob(title,jobtype,job.id,business.id, function(err,bizjob){
                  if(err) next(err);
                  else{
                    //create employee
                    Member.app.models.employee.createEmployee(title,type,bizjob.id,memberId,bizjob.businessId, function(err,employee){
                      if(err) next(err);
                      else next(null,employee);
                    })
                  }
                })
              }else{
                //not found
                var err = new Error('jobId is not valid');
                err.statusCode = 400;
                next(err);
              }
            })
          }else{
            //create job
            Member.app.models.job.createJob(title,type,stream, function(err,job){
              if(err) next(err);
              else{
                //create Bizjob
                Member.app.models.bizjob.createBizjob(title,jobtype,job.id,business.id, function(err,bizjob){
                  if(err) next(err);
                  else{
                    //create employee
                    Member.app.models.employee.createEmployee(title,type,bizjob.id,memberId,bizjob.businessId, function(err,employee){
                      if(err) next(err);
                      else next(null,employee);
                    })
                  }
                })
              }
            })
          }
        }
      })     
    }else if(companytitle && companytype){
      //TODO: find company on the basis of title and type
      //create business
      Member.app.models.business.createBuisiness(companytitle,companytype, function(err,business){
        if(err) next(err);
        else if(jobId){
          //find job
          Member.app.models.job.findById(jobId, function(err,job){
            if(err) next(err);
            else if(job){
              //found create bizjob
              Member.app.models.bizjob.createBizjob(title,jobtype,job.id,business.id, function(err,bizjob){
                if(err) next(err);
                else{
                  //create employee
                  Member.app.models.employee.createEmployee(title,type,bizjob.id,memberId,bizjob.businessId, function(err,employee){
                    if(err) next(err);
                    else next(null,employee);
                  })
                }
              })
            }else{
              //not found
              var err = new Error('jobId is not valid');
              err.statusCode = 400;
              next(err);
            }
          })
        }else{
          //create job
          Member.app.models.job.createJob(title,type,stream, function(err,job){
            if(err) next(err);
            else{
              //create Bizjob
              Member.app.models.bizjob.createBizjob(title,jobtype,job.id,business.id, function(err,bizjob){
                if(err) next(err);
                else{
                  //create employee
                  Member.app.models.employee.createEmployee(title,type,bizjob.id,memberId,bizjob.businessId, function(err,employee){
                    if(err) next(err);
                    else next(null,employee);
                  })
                }
              })
            }
          })
        }
      })
    }else{
      var err = new Error('required companytitle & companytype');
      err.statusCode = 403;
      next(err);
    }
  }

  //register a post method for students
  Member.remoteMethod(
    'Student',
    {
      http: {path: '/createStudents', verb: 'post'},
      accepts: [
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: true},
        {arg: 'stream', type: 'string', required: true},
        {arg: 'coursetype', type: 'string', required: true},
        {arg: 'school', type: 'string', required: false},
        {arg: 'schooltype', type: 'string', required: false},
        {arg: 'courseId', type: 'string', required: false},
        {arg: 'procourseId', type: 'string', required: false},
        {arg: 'schoolId', type: 'string', required: false},
        //TODO: intigrate with Guide
      ],
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'create students'
    }
  );

  Member.prototype.Student = function(title,type,stream,coursetype,school,schooltype,courseId,procourseId,schoolId,next){
    var memberId = this.id;
    if(procourseId){
      //find procourse
      Member.app.models.procourse.findById(procourseId, function(err,procourse){
        if(err) next(err);
        else if(procourse){
          //found procourse create student
          Member.app.models.student.createStudent(title,type,procourseId,memberId,procourse.providerType,procourse.providerId, function(err,student){
            if(err) next(err);
            else next(null,student);
          })
        }else{
          var err = new Error('procourseId is not valid');
          err.statusCode = 404;
          next(err);
        }
      })
    }else if(schoolId){
      //find school
      Member.app.models.school.findById(schoolId,{'include':'procourses'}, function(err,school){
        if(err) next(err);
        else if(school && school.procourses.length){
          var found = false;
          //check procourse is exist or not
          school.procourses().forEach(function(pcourse){
            if(pcourse.title == title){
              //TODO: multiple procourse with same title throw error
              found = true;
              //exist, create student
              Member.app.models.student.createStudent(title,type,pcourse.Id,memberId,procourse.providerType,procourse.providerId, function(err,student){
                if(err) next(err);
                else next(null,student);
              })
            }
          })
          if(!found && courseId){
            Member.app.models.course.findById(courseId, function(err,course){
              if(err) next(err);
              else if(course){
                //found create procourse
                Member.app.models.procourse.createProcourse(title,coursetype,course.id,'school',school.id, function(err,procourse){
                  if(err) next(err);
                  else{
                    //create student
                    Member.app.models.student.createStudent(title,type,procourse.id,memberId,procourse.providerType,procourse.providerId, function(err,student){
                      if(err) next(err);
                      else next(null,student);
                    })
                  }
                })
              }else{
                //not found
                var err = new Error('courseId is not valid');
                err.statusCode = 400;
                next(err);
              }
            })
          }else{
            //create course
            Member.app.models.course.createCourse(title,type,stream, function(err,course){
              if(err) next(err);
              else{
                //create Bizjob
                Member.app.models.procourse.createProcourse(title,coursetype,course.id,'school',school.id, function(err,procourse){
                  if(err) next(err);
                  else{
                    //create student
                    Member.app.models.student.createStudent(title,type,procourse.id,memberId,procourse.providerType,procourse.providerId, function(err,student){
                      if(err) next(err);
                      else next(null,student);
                    })
                  }
                })
              }
            })
          }
        }else if(school){
          //TODO: find job create bizjob
        }
      })     
    }else if(school && schooltype){
      //TODO: find school on the basis of title and type
      //create school
      Member.app.models.school.createSchool(school,schooltype, function(err,school){
        if(err) next(err);
        else if(courseId){
          //find course
          Member.app.models.course.findById(courseId, function(err,course){
            if(err) next(err);
            else if(course){
              //found create procourse
              Member.app.models.procourse.createProcourse(title,coursetype,course.id,'school',school.id, function(err,procourse){
                if(err) next(err);
                else{
                  //create student
                  Member.app.models.student.createStudent(title,type,procourse.id,memberId,procourse.providerType,procourse.providerId, function(err,student){
                    if(err) next(err);
                    else next(null,student);
                  })
                }
              })
            }else{
              //not found
              var err = new Error('courseId is not valid');
              err.statusCode = 400;
              next(err);
            }
          })
        }else{
          //create course
          Member.app.models.course.createCourse(title,type,stream, function(err,course){
            if(err) next(err);
            else{
              //create procourse
              Member.app.models.procourse.createProcourse(title,coursetype,course.id,'school',school.id, function(err,procourse){
                if(err) next(err);
                else{
                  //create student
                  Member.app.models.student.createStudent(title,type,procourse.id,memberId,procourse.providerType,procourse.providerId, function(err,student){
                    if(err) next(err);
                    else next(null,student);
                  })
                }
              })
            }
          })
        }
      })
    }else{
      var err = new Error('required school & schooltype');
      err.statusCode = 403;
      next(err);
    }
  }

  // member signup method
  Member.remoteMethod(
    'signup',
    {
      http: {path: '/signup', verb: 'post'},
      accepts: [
        {arg: 'fname', type: 'string', required: true},
        {arg: 'lname', type: 'string', required: true},
        {arg: 'email', type: 'string', required: true},
        {arg: 'password', type: 'string', required: true},
      ],
      returns: {root: true, type: 'object'},
      description: 'signup as a member'
    }
  );

  Member.signup = function(fname,lname,email,password,next){
    //first create a user
    Member.app.models.User.create({
      'username': email,
      'email': email,
      'password': password
    }, function(err,user){
      if(err) next(err);
      else if(user){
        //if user created then create member
        Member.create({
          'fname': fname,
          'lname': lname,
          'userId': user.id
        }, function(err,member){
          if(err) next(err);
          else{
            var res = {};
            res.member = member;
            res.user = user;
            next(null,res);
          }
        });
      }
    });
  }

  //signin method for all type of user
  Member.remoteMethod(
    'signin',
    {
      http: {path: '/signin', verb: 'post'},
      accepts: [
        {arg: 'email', type: 'string', required: true},
        {arg: 'password', type: 'string', required: true},
      ],
      returns: {root: true, type: 'object'},
      description: 'signin for all type user'
    }
  );

  Member.signin = function(email,password,next){
    var res = {};
    //signin user from user.login
    Member.app.models.User.login({
      'username': email,
      'email': email,
      'password': password
    }, function(err,loggedIn){
      if(err) next(err);
      else if(loggedIn){
        res = loggedIn;
        //find role of logged in user
        Member.app.models.RoleMapping.findOne({
          'where': {'principalId': loggedIn.userId },
          //'include': 'role'
        }, function(err,rMap){
          if(err) next(err);
          else{
            rMap.role(function(err,role){
              var rname = role.name;
              res['userType'] = rname;
              //find user profile on basis of role name
              if(rname == 'member'){
                Member.findOne({
                  'where': {'userId': loggedIn.userId }
                },function(err,member){
                  if(err) next(err);
                  else{
                    res['profile'] = member;
                    next(null,res);
                  }
                })
              }else if(rname == 'business'){
                Member.app.models.Business.findOne({
                  'where': {'userId': loggedIn.userId }
                },function(err,biz){
                  if(err) next(err);
                  else{
                    res['profile'] = biz;
                    next(null,res);
                  }
                })
              }else if(rname == 'guide'){
                Member.app.models.Guide.findOne({
                  'where': {'userId': loggedIn.userId }
                },function(err,guide){
                  if(err) next(err);
                  else{
                    res['profile'] = guide;
                    next(null,res);
                  }
                })
              }else if(rname == 'school'){
                Member.app.models.School.findOne({
                  'where': {'userId': loggedIn.userId }
                },function(err,school){
                  if(err) next(err);
                  else{
                    res['profile'] = school;
                    next(null,res);
                  }
                })
              }
            })
          }
        })
      }
    });
  }

  // add skills
  Member.remoteMethod(
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

  Member.prototype.setSkills = function(skills, next){
    Member.findById(this.id, function(err,member){
      if(err) next(err);
      else{
        if(skills[0].skills) //only for Front End response
          skills = skills[0].skills;
        member.updateAttributes({
          'skills': skills
        }, function(err,skills){
          if(err) next(err);
          else next(null,skills);
        });
      }
    });
  }

  // register a member uploadmedia remote method
  Member.remoteMethod(
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

  Member.prototype.uploadMedia = function(req,next){
    var memberId = this.id;
    var baseUrl = 'http://'+Member.app.get('host')+':'+ Member.app.get('port')+'/api/containers/';
    Member.findById(memberId, function(err,member){
      if(err) next(err);
      else if(member){
        var galObj = member.gallery || {};
        Member.app.models.business.upload(memberId,req, function(err,file){
          if(err) next(err);
          else{
            //set gallery object
            if(file.files.pic){
              galObj['pic'] = baseUrl+file.files.pic[0].container+'/download/'+file.files.pic[0].name
            }
            if(file.files.banner){
              galObj['banner'] = baseUrl+file.files.banner[0].container+'/download/'+file.files.banner[0].name
            }
            //update gallery
            member.updateAttributes({
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

  // create interaction
  Member.remoteMethod(
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

  Member.prototype.createInteraction = function(data,next){
    //TODO: validate relations
    Member.app.models.interaction.create(data, function(err,interaction){
      if(err) next(err)
      else next(null,interaction)
    })
  }

  // register a Member resetPassword remote method
  Member.remoteMethod(
    'resetPassword',
    {
      http: {path: '/resetPassword', verb: 'post'},
      accepts: [
        {arg: 'password', type: 'string', required: true},
      ],
      returns: {root: true, type: 'object'},
      description: 'reset password'
    }
  );

  Member.resetPassword = function(password,next){
    var loopback = require('loopback');
    var userId = loopback.getCurrentContext().active.http.req.accessToken.userId;
    Member.app.models.User.findById(userId, function(err,user){
      if(err) next(err);
      else{
        user.updateAttributes({'password':password}, function(err,done){
          if(err) next(err);
          else next(null,{status:'success'})
        })
      }
    })  
  }

  Member.disableRemoteMethod("find", true);
  Member.disableRemoteMethod("upsert", true);
  Member.disableRemoteMethod("create", true);
  Member.disableRemoteMethod('deleteById',true);
  Member.disableRemoteMethod("count", true);
  Member.disableRemoteMethod("exists", true);
  Member.disableRemoteMethod("findOne", true);
  Member.disableRemoteMethod('__count__skill', false);
  //Member.disableRemoteMethod("__get__profile", false);
  Member.disableRemoteMethod("__create__profile", false);
  Member.disableRemoteMethod("__destroy__profile", false);
  Member.disableRemoteMethod('__delete__activity',false);
  Member.disableRemoteMethod('__destroyById__activity', false);
  Member.disableRemoteMethod('__delete__breviews',false);
  Member.disableRemoteMethod('__destroyById__breviews', false);
  Member.disableRemoteMethod('__count__breviews', false);
  Member.disableRemoteMethod('__delete__creviews',false);
  Member.disableRemoteMethod('__destroyById__creviews', false);
  Member.disableRemoteMethod('__count__creviews', false);
  Member.disableRemoteMethod('__create__employees',false);
  Member.disableRemoteMethod('__delete__employees',false);
  Member.disableRemoteMethod('__destroyById__employees', false);
  Member.disableRemoteMethod('__count__employees', false);
  Member.disableRemoteMethod('__delete__greviews',false);
  Member.disableRemoteMethod('__destroyById__greviews', false);
  Member.disableRemoteMethod('__count__greviews', false);
  Member.disableRemoteMethod('__delete__ireviews',false);
  Member.disableRemoteMethod('__destroyById__ireviews', false);
  Member.disableRemoteMethod('__count__ireviews', false);
  Member.disableRemoteMethod('__delete__jreviews',false);
  Member.disableRemoteMethod('__destroyById__jreviews', false);
  Member.disableRemoteMethod('__count__jreviews', false);
  Member.disableRemoteMethod('__delete__sreviews',false);
  Member.disableRemoteMethod('__destroyById__sreviews', false);
  Member.disableRemoteMethod('__count__sreviews', false);
  Member.disableRemoteMethod('__create__students',false);
  Member.disableRemoteMethod('__delete__stuappls',false);
  Member.disableRemoteMethod('__destroyById__stuappls', false);
  Member.disableRemoteMethod('__updateById__stuappls', false);
  Member.disableRemoteMethod('__count__stuappls', false);
  Member.disableRemoteMethod('__delete__jobappls',false);
  Member.disableRemoteMethod('__destroyById__jobappls', false);
  Member.disableRemoteMethod('__updateById__jobappls', false);
  Member.disableRemoteMethod('__count__jobappls', false);
  Member.disableRemoteMethod('__delete__students',false);
  Member.disableRemoteMethod('__destroyById__students', false);
  Member.disableRemoteMethod('__count__students', false);
  Member.disableRemoteMethod('createChangeStream', true);
  Member.disableRemoteMethod('updateAll', true);
};
