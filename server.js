/*********************************************************************************
* WEB322 – Assignment 06
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part of this
* assignment has been copied manually or electronically from any other source (including web sites) or
* distributed to other students.
*
* Name: __Darshilkumar Mungalpara__ Student ID: __164548182__ Date: _December 10, 2020__
*
* Online (Heroku) Link: ________________________________________________________
*
********************************************************************************/
var express = require("express");
const path = require ("path");
const data = require("./data-service.js");
const multer = require("multer");
const bodyParser = require('body-parser');
var clientSessions = require("client-sessions");
const exphbs = require('express-handlebars');
var dataServiceAuth = require('./data-service-auth.js');

var app = express();
var fs = require('fs');

const HTTP_PORT = process.env.PORT || 8080;

app.engine('.hbs', exphbs({ extname: '.hbs', defaultLayout: 'main' , helpers: {
    navLink: function(url, options){
        return '<li' +
        ((url == app.locals.activeRoute) ? ' class="active" ' : '') + 
        '><a href="' + url + '">' + options.fn(this) + '</a></li>';
       },
       equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
        return options.inverse(this);
        } else {
        return options.fn(this);
        }
       }
    } 
}));
app.set('view engine', '.hbs');

app.use(function(req,res,next){
    let route = req.baseUrl + req.path;
    app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
    next();
   });

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended : true}));
app.use(clientSessions({
    cookieName: "session", 
    secret: "web322_assignment6",
    duration: 3 * 60 * 1000, // 3minutes
    activeDuration: 1000 * 60 
}));
app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
   });

   let ensureLogin = (req, res, next) => {
    if(!req.session.user){
        res.redirect("/login");
    } else {
        next();
    }
};
   
// call this function after the http server starts listening for requests
function onHttpStart() {
  console.log("Express http server listening on: " + HTTP_PORT);
}

const storage = multer.diskStorage({
    destination: "./public/images/uploaded",
    filename: function (req, file, cb) {
      // we write the filename as the current date down to the millisecond
      // in a large web service this would possibly cause a problem if two people
      // uploaded an image at the exact same time. A better way would be to use GUID's for filenames.
      // this is a simple example.
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });
  
  // tell multer to use the diskStorage function for naming files instead of the default.
  const upload = multer({ storage: storage });


// setup a 'route' to listen on the default url path (http://localhost)
app.get("/",(req,res)=>{
    //res.send("Hello World<br /><a href='/about'>Go to the about page</a>");
   // res.sendFile(path.join(__dirname,"/views/home.hbs"));
   res.render("home", {});
});

// setup another route to listen on /about
app.get("/about",(req,res)=>{
   // res.sendFile(path.join(__dirname,"/views/about.html"));
   res.render("about", {});
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
    res.render('userHistory');
})

app.get("/employees", ensureLogin, (req,res) => {
    if (req.query.status){
        data.getEmployeesByStatus(req.query.status)
         .then((returningStatus)=> {
            data = data.map(value => value.dataValues);
         if(returningStatus.length>0 )res.render("employees", {employees:returningStatus})
         else res.render("employees",{message: "no results"})
         })
         .catch(err => res.render("employees", {message: "no results"}))
     }
    else if (req.query.department){
        data.getEmployeesByDepartment(req.query.department)
        .then((returningDepartment)=> {
            data = data.map(value => value.dataValues);
            if(returningDepartment.length>0 )res.render("employees", {employees:returningDepartment})
            else res.render("employees",{message: "no results"})
            })
            .catch(err => res.render("employees", {message: "no results"}))
     }
    else if (req.query.manager){
        data.getEmployeesByManager(req.query.manager)
        .then((returningManager)=> {
            data = data.map(value => value.dataValues);
            if(returningManager.length>0 )res.render("employees", {employees:returningManager})
            else res.render("employees",{message: "no results"})
            })
            .catch(err => res.render("employees", {message: "no results"}))
         
     }
     else {
    data.getAllEmployees()
        .then((data)=> {
            data = data.map(value => value.dataValues);
            if(data.length>0 )res.render("employees", {employees:data})
            else res.render("employees",{message: "no results"})
            })
            .catch(err => res.render("employees", {message: "no results"}))
     }
});

app.get('/employees/add', ensureLogin, (req,res)=>{
    data.getDepartments()
    .then((data)=>{
        data = data.map(value => value.dataValues);
        res.render("addEmployee",{departments: data})
    })
    .catch(()=>{
        res.render("addEmployee",{departments:[]})
    }) 
});

app.get("/employee/:empNum", ensureLogin, (req, res) => {
    // initialize an empty object to store the values
    let viewData = {};
    data.getEmployeeByNum(req.params.empNum).then((data) => {
        if (data) {
            data = data.map(value => value.dataValues);
            viewData.employee = data; //store employee data in the "viewData" object as "employee"
        } else {
            viewData.employee = null; // set employee to null if none were returned
        }
        })
        .catch(() => {
        viewData.employee = null; // set employee to null if there was an error
        })
        .then(data.getDepartments)                            
        .then((data) => {
            data = data.map(value => value.dataValues);
            viewData.departments = data; // store department data in the "viewData" object as "departments"
            // loop through viewData.departments and once we have found the departmentId that matches
            // the employee's "department" value, add a "selected" property to the matching
            // viewData.departments object
            for (let i = 0; i < viewData.departments.length; i++) {
            if (viewData.departments[i].departmentId == viewData.employee.department) {
            viewData.departments[i].selected = true;
            }
            }
        })
        .catch(() => {
        viewData.departments = []; // set departments to empty if there was an error
        })
        .then(() => {
            
            if (viewData.employee == null) { // if no employee - return an error
            res.status(404).send("Employee Not Found");
            } else {  
            res.render("employee", { viewData: viewData }); // render the "employee" view
            }
        });
   });

app.get('/department/:departmentId', ensureLogin, (req, res) => {
    data.getDepartmentById(req.params.departmentId)
    .then((data) => {
        data = data.map(value => value.dataValues);
        if(data.length>0) res.render("department",{department:data});
        else res.status(404).send("Department Not Found"); 
    })
    .catch(()=>{res.status(404).send("Department Not Found")})
});

app.get("/images", ensureLogin, (req,res)=>{

    fs.readdir("./public/images/uploaded",(err,images)=>{
       
       // res.json({"images": images})
       res.render("images", {data: images, title: "Images" });
         });
    
});

app.get("/departments/add", ensureLogin, (req, res) => {
    
    //res.sendFile(path.join(__dirname+"/views/addEmployee.html"));
    res.render("addDepartment");
});

//'route' set up for add Images
app.get("/images/add", ensureLogin, (req,res)=>{
    //res.sendFile(path.join(__dirname,"/views/addImage.html"))
    res.render("addImage", {});
});

/*app.get("/managers",(req,res) => {
    
    data.getManagers().then((data) => {
        res.json(data);
    });
});*/

app.get("/departments", ensureLogin, (req,res) => {
    data.getDepartments().then((data) => {
        data = data.map(value => value.dataValues);
       if(data.length>0) res.render("departments", {departments: data});
       else res.render("departments", {message: "no results"})
    }) .catch(err => res.render("departments", {message: "no results"}))

});

app.get('/employees/delete/:empNum', ensureLogin, (req, res) => {
    data.deleteEmployeeByNum(req.params.empNum)
    .then((data) => res.redirect("/employees"))
    .catch(() => res.status(500).send("Unable to Remove Employee / Employee not found"))
})

app.post('/register', (req, res) => {
    dataServiceAuth.registerUser(req.body)
    .then((value) => {
        res.render('register', {successMessage: "User created"});
    }).catch((err) => {
        res.render('register', {errorMessage: err, userName: req.body.userName});
    })
});

app.post('/login', (req, res) => {
    req.body.userAgent = req.get('User-Agent');

    dataServiceAuth.checkUser(req.body)
    .then((user) => {
        req.session.user = {
            userName: user.userName,// authenticated user's userName
            email: user.email, // authenticated user's email
            loginHistory: user.loginHistory   // authenticated user's loginHistory

        }
        res.redirect('/employees');
    }).catch((err) => {
        res.render('login', {errorMessage: err, userName: req.body.userName});
    });
});

app.post('/employees/add', function(req, res) {
    data.addEmployee(req.body)
        .then(res.redirect('/employees'))
        .catch((err) => res.json({"message": err}))   
}) 

app.post('/departments/add', function(req, res) {
    data.addDepartment(req.body)
        .then(res.redirect('/departments'))
        .catch((err) => res.json({"message": err}))   
}) 

app.post("/employee/update", function(req, res){
    data.updateEmployee(req.body)
    .then(res.redirect('/employees'))
    .catch(() => res.status(500).send("Unable to Update Employee"))  
});

app.post("/department/update", (req, res) => {
    data.updateDepartment(req.body)
    .then(function(data) {
        res.redirect("/departments");
    }).catch(function(err) {
        res.render("/departments",{message : "no results"});
    });
});



app.post("/images/add", upload.single("imageFile"),(req,res)=>{
    data.addImage(req.body).then(()=>{
            res.redirect("/images");
    });

});



app.use((req,res)=>{
    res.status(404).send("Page Not Found");

});

// setup http server to listen on HTTP_POR
data.initialize()
.then(dataServiceAuth.initialize)
.then(function(){
 app.listen(HTTP_PORT, function(){
 console.log("app listening on: " + HTTP_PORT)
 });
}).catch(function(err){
 console.log("unable to start server: " + err);
});
