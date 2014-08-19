var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var checkUser = require('./lib/utility').checkUser; // CHECK ME OUT AND DO ME LATER... BABY ;)
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/login',function(req, res){
  res.render('login');
});
app.post('/login',function(req, res){
  // log in user
  console.log('logging in:',req.body);
  checkUser(req.body.username, req.body.password,
    function found(){
      res.render('index');
    },
    function notFound(){
      res.render('login');
    }
  );
});

      // app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}));
      // console.log(req.session);
      // app.use(function(req, res, next) {
      //   var sess = req.session;
      //   if (sess.views) {
      //     sess.views++;
      //     res.setHeader('Content-Type', 'text/html');
      //     res.write('<p>views: ' + sess.views + '</p>');
      //     res.write('<p>expires in: ' + (sess.cookie.maxAge / 1000) + 's</p>');
      //     res.end();
      //   } else {
      //     sess.views = 1;
      //     res.end('welcome to the session demo. refresh!');
      //   }
      // });

app.get('/signup',function(req, res){
  res.render('signup');
})
app.post('/signup',function(req, res){
  // if username already taken
  new User({ username: req.body.username }).fetch().then(function(found) {
      if (found) {
        console.log('ERROR:',found.attributes.username,'already exists.');
        res.set(409);//, 'Conflict. ' + found.attributes.username + ' already exists.');
        res.render('signup');
      } else {
        // create user
        new User({
          'username': req.body.username,
          'password': req.body.password
        }).save().then(function(newUser){
          // redirect to /links
          res.render('index');
        })
      }
  });
});

app.post('/create',function(req, res){
  res.render('signup');
})

app.all('*', function(req, res){
  console.log('NO NO NO',req.body);
  res.redirect('/login');
  // on submit
    // if user is real
      // redirect to /links
});

app.get('/',
function(req, res) {
  res.render('index');
});

app.get('/create',
function(req, res) {
  res.render('index');
});

app.get('/links',
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
