
/**
 * Module dependencies.
 */

var express          = require('express'),
	persistence      = require('persistencejs/persistence').persistence,
	persistenceStore = require('persistencejs/persistence.store.mysql'),
	EventEmitter     = require('events').EventEmitter;

var app = module.exports = express.createServer();

// Configuration

var $PORT = 3333;

//DB Settings
persistenceStore.config(persistence, 'localhost', 3306, 'nodejs2', 'root', '');
var session = persistenceStore.getSession();

var Comment = persistence.define('Comment', {
	name:    'TEXT',
	comment: 'TEXT',
	date:    'DATE',
	delete:  'BOOL'
});

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.bodyDecoder());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res){
	var datas = Comment.all(session).order('date', true);
	datas.list(null, function(results){
		res.render('index', {
			locals: {
				status: '',
				form: res.partial('input_form', {
					locals: {
						name:   '',
						comment:''
					}
				}),
				list: results
			}
		});
	});
});

app.post('/', function(req, res){
	var e = new EventEmitter();
	var name    = ((req.body.name && req.body.name != '') ? req.body.name : '名無しさん'),
		comment = ((req.body.comment && req.body.comment != '') ? req.body.comment : ''),
		status  = '',
		list    = [];

	e.on('end', function(){
		var datas = Comment.all(session).order('date', true);
		datas.list(null, function(results){
			res.render('index', {
				locals: {
					status : status,
					form   : res.partial('input_form', {
						locals: {
							name    : name,
							comment : comment
						}
					}),
					list   : results
				}
			});
		});
	});

	if(comment != ''){
		var row = new Comment({
			name    : name,
			comment : comment,
			date    : new Date()
		});

		name = '';
		comment = '';

		session.add(row);
		session.transaction(function(tx){
			session.flush(tx, function(){
				status = '書き込みに成功しました。';
				e.emit('end');
			});
		});
	}else{
		status = 'コメントが入力されていません。';
		e.emit('end');
	}

});

// Only listen on $ node app.js

if (!module.parent) {
	session.schemaSync(null, function(){
		app.listen($PORT);
		console.log("Express server listening on port %d", app.address().port);
	});
}
