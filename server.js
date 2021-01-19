/*********************************************************************************
* WEB322 – Assignment 06
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part of this
* assignment has been copied manually or electronically from any other source (including web sites) or
* distributed to other students.
*
* Name: Jigarkumar Koradiya Student ID: 164861189 Date: 11/12/2020
*
* Online (Heroku) Link: https://whispering-plains-85137.herokuapp.com/
*
********************************************************************************/
const exphbs = require("express-handlebars")
const dataServiceAuth = require('./data-service-auth');
var data = require("./data-service") 
var clientSessions = require("client-sessions")
var express = require("express")
var path = require("path")
var multer = require("multer")
var bodyParser = require("body-parser") 
var app = express() 
var fs = require("fs") 
const { resolve } = require("path")
app.use(express.static('public')); 
app.engine('.hbs', exphbs({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
        navLink: function (url, options) {
            return '<li' +
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') + '><a href="' + url + '">' + options.fn(this) + '</a></li>';
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
app.use(express.static(path.join(__dirname, 'views'))) 
app.use(bodyParser.urlencoded({ extended: true }))

var HTTP_PORT = process.env.PORT || 8080

const storage = multer.diskStorage({
    destination: "./public/images/uploaded",
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})
const upload = multer({ storage: storage });

app.use(function (req, res, next) {
    let route = req.baseUrl + req.path; app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
    next();
})

app.use(clientSessions({
    cookieName: "session",  
    secret: "web322_a6", 
    duration: 2 * 60 * 1000, //2 mintues duration in ms
    activeDuration: 1000 * 60 //session extension by each request
}))

app.use(function (req, res, next) {
    res.locals.session = req.session;
    next();
});

ensureLogin = (req, res, next) => {
    if (!req.session.user) {
        res.redirect("/login");
    }
    else {
        next();
    }
}

app.get("/", function (req, res) {
    res.render(path.join(__dirname, "views/home.hbs"))
})

app.get("/about", function (req, res) {
    res.render(path.join(__dirname, "views/about.hbs"))
})

app.get("/employees", ensureLogin, function (req, res) {
    if (req.query.status) {
        data.getEmployeesByStatus(req.query.status)
            .then((data) => {
                if (data.length > 0) res.render("employees", { employees: data });
                else res.render("employees", { message: "No results returned." })
            }).catch((err) => {
                res.render({ message: "No results returned." });
            })
    }

    else if (req.query.department) {
        data.getEmployeesByDepartment(req.query.department)
            .then((data) => {
                if (data.length > 0) res.render("employees", { employees: data });
                else res.render("employees", { message: "No results returned." })
            }).catch((err) => {
                res.render({ message: "no results" });
            })
    }

    else if (req.query.manager) {
        data.getEmployeesByManager(req.query.manager)
            .then((data) => {
                if (data.length > 0) res.render("employees", { employees: data });
                else res.render("employees", { message: "No results returned." })
            }).catch((err) => {
                res.render({ message: "no results" })
            })
    }

    else {
        data.getAllEmployees()
            .then((data) => {
                if (data.length > 0) res.render("employees", { employees: data });
                else res.render("employees", { message: "No results returned." })
            })
            .catch((err) => {
                res.render({ message: "no results" })
            })
    }
})

app.get("/employee/:empNum", ensureLogin, (req, res) => {
    let viewData = {};
    data.getEmployeeByNum(req.params.empNum).then((data) => {
        if (data) {
            viewData.employee = data;
        } else {
            viewData.employee = null; 
        }
    }).catch(() => {
        viewData.employee = null; 
    }).then(data.getDepartments)
        .then((data) => {
            viewData.departments = data; 
            for (let i = 0; i < viewData.departments.length; i++) {
                if (viewData.departments[i].departmentId == viewData.employee.department) {
                    viewData.departments[i].selected = true;
                }
            }
        }).catch(() => {
            viewData.departments = []; 
        }).then(() => {
            if (viewData.employee == null) { 
                res.status(404).send("Employee Not Found");
            } else {
                res.render("employee", { viewData: viewData }); 
            }
        });
});

app.get("/employees/add", ensureLogin, (req, res) => {
    data.getDepartments()
        .then((data) => {
            res.render("addEmployee", { departments: data })
        })
        .catch((err) => {
            res.render("addEmployee", { departments: [] });
        })
})

app.get("/employees/delete/:empNum", ensureLogin, (req, res) => {
    data.deleteEmployeeByNum(req.params.empNum)
        .then(() => {
            res.redirect("/employees");
        }).catch((err) => {
            res.status(500).send("Unable to Remove Employee / Employee not found");
        })
})

app.get("/departments/delete/:depNum", ensureLogin, (req, res) => {
    data.deleteDepartmentByNum(req.params.depNum)
        .then(() => {
            res.redirect("/departments");
        }).catch((err) => {
            res.status(500).send("Unable to Remove Employee / Employee not Found");
        })
})

app.get("/departments/add", ensureLogin, (req, res) => {
    res.render(path.join(__dirname, "/views/addDepartment.hbs"))
})

app.get("/departments", ensureLogin, function (req, res) {
    data.getDepartments()
        .then((data) => {
            res.render("departments", { departments: data })
        })
        .catch(err => res.status(404).send('departments not found'))
})

app.get("/department/:departmentId", ensureLogin, (req, res) => {
    data.getDepartmentById(req.params.departmentId)
        .then((data) => {
            res.render("department", { department: data });
        }).catch((err) => {
            res.status(404).send("Department Not Found")
        }
        )
})

app.get("/images", ensureLogin, (req, res) => {
    fs.readdir("./public/images/uploaded", (err, image) => {
        res.render("images", { "images": image });
    })
})

app.get("/images/add", ensureLogin, (req, res) => {
    res.render(path.join(__dirname, "/views/addImage.hbs"))
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.get("/logout", (req, res) => {
    req.session.reset();
    res.redirect("/");
})

app.get("/userHistory", ensureLogin, (req, res) => {
    res.render("userHistory");
})

app.post("/employees/add", ensureLogin, (req, res) => {
    data.addEmployee(req.body)
        .then(() => {
            res.redirect('/employees');
        }).catch((err) => {
            res.status(500).send("Unable to Update Employee");
        })
})

app.post("/employee/update", ensureLogin, (req, res) => {
    data.updateEmployee(req.body)
        .then((data) => {
            res.redirect("/employees")
        })
        .catch((err) => {
            console.log(err)
        })
});

app.post("/departments/add", ensureLogin, (req, res) => {
    data.addDepartment(req.body)
        .then(() => { res.redirect('/departments') })
        .catch((err) => { message: err });
})

app.post("/departments/update", ensureLogin, (req, res) => {
    data.updateDepartment(req.body)
        .then(() => {
            res.redirect("/departments")
        })
        .catch((err) => {
            console.log(err)
        })
});

app.post("/images/add", upload.single('imageFile'), ensureLogin, (req, res) => {
    res.redirect('/images')
})

app.post("/register", (req, res) => {
    dataServiceAuth.registerUser(req.body)
        .then(() => {
            res.render("register", { successMessage: "User created" });
        })
        .catch((err) => {
            res.render("register", { errorMessage: err, userName: req.body.userName });
        })
})

app.post("/login", (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    dataServiceAuth.checkUser(req.body)
        .then((user) => {
            req.session.user = {
                userName: user.userName,
                email: user.email,
                loginHistory: user.loginHistory
            }
            res.redirect("/employees");
        })
        .catch((err) => {
            res.render("login", { errorMessage: err, userName: req.body.userName });
        })
})


app.get("*", function (req, res) {
    res.sendFile(path.join(__dirname, "./views/pagenotfound.html"));
})


data.initialize()
    .then(dataServiceAuth.initialize)
    .then(() => {
        app.listen(HTTP_PORT, () => {
            console.log("Express http server listening on port http://localhost:" + HTTP_PORT)
        })
    }).catch((err) => {
        console.log(err)
    });