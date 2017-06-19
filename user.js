var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// 返回一个mongo用户库实例
module.exports = mongoose.model('User', new Schema({ 
    name: String, 
    password: String, 
    admin: Boolean 
}));
