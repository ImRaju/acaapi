var solr = require('solr-client');

module.exports = function(Job) {
  Job.observe('before save', function(ctx,next){
    if (ctx.currentInstance) {
      var bObj = {};
      var ci   = ctx.currentInstance;
      //initialize before object
      bObj['code'] = ci.code;
      bObj['title'] = ci.title;
      bObj['type'] = ci.type;
      bObj['brief'] = ci.brief;
      bObj['detail'] = ci.detail;
      bObj['skills'] = ci.skills;
      bObj['profile'] = ci.profile;
    }
    ctx.hookState.before = bObj;
    next();
  });

  Job.observe('after save', function(ctx,next){
    //Job history
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
        if(err) console.log('Job history error ',err);
      })
    next();
  });

  //create job method
  Job.createJob = function(title,type,stream,next){
    Job.create({
      'code': 'job-' + (Math.round(Date.now())) + "-" + (Math.round(Math.random() * 1000)),
      'title': title,
      'type': type,
      'stream': stream
    }, function(err,job){
      if(err) next(err);
      else next(null,job);
    });
  }

  // register a job detail remote method
  Job.remoteMethod(
    'details',
    {
      http: {path: '/details', verb: 'get'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'job details'
    }
  );

  Job.prototype.details = function(next){
    Job.findById(this.id, function(err,job){
      if(err) next(err);
      else if(job){
        Job.app.models.bizjob.find({
          'where': {'jobId':job.id},
          //'fields': ['title','type','location','businessId'],
          // Note: filter include and filter fields don't work well together. issue #2186
          'include': {'relation': 'business','scope':{'fields':['title','id']}}
        }, function(err,bj){
          if(err) next(err);
          else {
            job['bizjob'] = bj;
            next(null,job);
          }
        })
      }
    });
  };

  // register a job search remote method
  Job.remoteMethod(
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
      description: 'job search'
    }
  );

  Job.search = function(query,filter,facet/*title,code,type*/,limit,next){
    //solr search
    var start = 0; var rows = 10;
    var q = query || '*'
    if(limit){
      lObj = limit.split(":", 2);
      start = lObj[0];
      rows = lObj[1];
    }
    var client = solr.createClient(Job.app.get("jSolrParams"));
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
    
    Job.find({
      'where': rule,
      'limit': limit
    }, function(err,job){
      if(err) next(err);
      else next(null,job);
    });*/
  };

  // register a job lookup remote method
  Job.remoteMethod(
    'lookup',
    {
      http: {path: '/lookup', verb: 'get'},
      accepts: [
        {arg: 'title', type: 'string', required: true},
        {arg: 'type', type: 'string', required: false},
        {arg: 'limit', type: 'number', required: false},
      ],
      returns: {root: true, type: 'object'},
      description: 'job lookup'
    }
  );

  Job.lookup = function(title,type,limit,next){
    var scoreService = Job.app.dataSources.scoreService;
    scoreService.create('jobs/lookup',{'key':title},'',function(err,jobs){
      if(err) next(err);
      else next(null,jobs);
    });
  };

  // add skills
  Job.remoteMethod(
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

  Job.prototype.setSkills = function(skills, next){
    Job.findById(this.id, function(err,job){
      if(err) next(err);
      else{
        if(skills[0].skills) //only for Front End response
          skills = skills[0].skills;
        job.updateAttributes({
          'skills': skills
        }, function(err,skills){
          if(err) next(err);
          else next(null,skills);
        });
      }
    });
  }

  // Register a 'index' remote method
  Job.remoteMethod(  
    'index',
    {
      http: {path: '/index', verb: 'post'},
      isStatic: false,
      returns: {root: true, type: 'object'},
      description: 'indexes a job of given id'
    }
  );

  Job.prototype.index = function(next){
    var cObj = {};
    var client = solr.createClient(Job.app.get("jSolrParams"));
    var skills = [];

    Job.findById(this.id, function(err,j){
      if(err) next(err);
      else if(j){
        //skills
        if(j.skills){
          j.skills.forEach(function(skill){
            skills.push(skill.code);
          })
        }

        jObj = {'id':j.id,'title':j.title,'code':j.code,'type':j.type,'brief':j.brief,'detail':j.detail,
          'stream':j.stream,'skills':skills};

        //indexing solr
        client.add(jObj, function(err,done){
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

  Job.disableRemoteMethod('find', true);
  Job.disableRemoteMethod('upsert', true);
  Job.disableRemoteMethod('count', true);
  Job.disableRemoteMethod('exists', true);
  Job.disableRemoteMethod('updateAll', true);
  Job.disableRemoteMethod('findOne', true);
  Job.disableRemoteMethod('deleteById',true);
  Job.disableRemoteMethod('findById',true);
  Job.disableRemoteMethod('__count__skill', false);
  Job.disableRemoteMethod('__get__profile',false);
  Job.disableRemoteMethod('__destroy__profile',false);
  Job.disableRemoteMethod('__delete__businesses',false);
  Job.disableRemoteMethod('__create__businesses',false);
  Job.disableRemoteMethod('__updateById__businesses', false);
  Job.disableRemoteMethod('__destroyById__businesses', false);
  Job.disableRemoteMethod('__count__businesses', false);
  Job.disableRemoteMethod('__exists__businesses',false);
  Job.disableRemoteMethod('__link__businesses',false);
  Job.disableRemoteMethod('__unlink__businesses',false);
  Job.disableRemoteMethod('__get__history',false);
  Job.disableRemoteMethod('__findById__history',false);
  Job.disableRemoteMethod('__create__history',false);
  Job.disableRemoteMethod('__updateById__history',false);
  Job.disableRemoteMethod('__count__history',false);
  Job.disableRemoteMethod('__delete__history',false);
  Job.disableRemoteMethod('__destroyById__history', false);
  Job.disableRemoteMethod('createChangeStream', true);
};
