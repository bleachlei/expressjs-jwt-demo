var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var jwt    = require('jsonwebtoken'); // 使用jwt签名
var config = require('./config'); // 引入配置
var User   = require('./user'); // 获得mongo用户库实例

// mongo数据库设置
mongoose.connect(config.database); 
// 设置superSecret 全局参数
app.set('superSecret', config.jwtsecret); 
// 使用 body parser 将post参数及URL参数可以通过 req.body 拿到
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// 使用 morgan 将请求日志输出到控制台
app.use(morgan('dev'));
//路径
app.get('/', function(req, res) {
    res.send('JWT 授权访问的API路径 http://localhost:' + config.network.port + '/api');
});

app.listen(config.network.port);
console.log('JWT测试服务已经开启地址： http://localhost:' + config.network.port);
// 在steup 路径下简单用户数据写入操作，为了身份验证，当然也可以不使用数据库。
app.post('/setup', function(req, res) {
  if(req.body.name && req.body.password){  
  var nick = new User({ 
    name: req.body.name, 
    password: req.body.password,
    admin:req.body.admin||false
  }); 
  nick.save(function(err) {
    if (err) throw err;
    console.log('用户存储成功');
    res.json({ success: true });
  });}
  else{
  	res.json({ success: false,msg:"错误参数" });
  }
});

// 用户授权路径，返回JWT 的 Token 验证用户名密码
app.post('/authenticate', function(req, res) {
  User.findOne({
    name: req.body.name
  }, function(err, user) {
    if (err) throw err;
    if (!user) {
      res.json({ success: false, message: '未找到授权用户' });
    } else if (user) {
      if (user.password != req.body.password) {
        res.json({ success: false, message: '用户密码错误' });
      } else {
        var token = jwt.sign(user, app.get('superSecret'), {
          expiresIn : 60*60*24// 授权时效24小时
        });
        res.json({
          success: true,
          message: '请使用您的授权码',
          token: token
        });
      }   
    }
  });
});

//  localhost:端口号/api 路径路由定义
var apiRoutes = express.Router(); 

apiRoutes.use(function(req, res, next) {

  // 拿取token 数据 按照自己传递方式写
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  
  if (token) {  	
    // 解码 token (验证 secret 和检查有效期（exp）)
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {      

      if (err) {
        return res.json({ success: false, message: '无效的token.' });    
      } else {
        // 如果验证通过，在req中写入解密结果
        req.decoded = decoded;  
        //console.log(decoded)  ;
        next(); //继续下一步路由
      }
    });
  } else {
    // 没有拿到token 返回错误 
    return res.status(403).send({ 
        success: false, 
        message: '没有找到token.' 
    });

  }
});



apiRoutes.get('/', function(req, res) {
  res.json({ message: req.decoded._doc.name+'  欢迎使用API' });
});
//获取所有用户数据
apiRoutes.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});   
// 注册API路由
app.use('/api', apiRoutes);
