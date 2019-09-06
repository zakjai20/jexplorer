const child_process = require('child_process');
const express = require('express');
const path = require('path');
const fs = require('fs');

const {Router, static} = express;


const {generateID} = require('../jtools');
const newP = require('../jnewp');

var log = console.log;

var url_clients = path.join(__dirname, "client");

var to = {
    $home : path.join(`C:\\Users\\Z-J\\Downloads`),
    $dwn  : "download.html",
    $upl  : "upload.html"
}

function handeldata(req,res,next){
    var data = '';
    req.on('data',(chunk)=>{
        data += chunk;
    });
    req.on('end',()=>{
        try{
            req.Jdata = JSON.parse(data);
        }catch{}
        req.data = data;
        next();
    });
}

function handelUrl(req, res, next){
    function getUrl(url){
        var [u,...s] = url.split('?');
        s = s.join('?');
        return {
            url : u,
            fullurl : url,
            ...getSearch(s)
        }
    }
    function getSearch(str){
        var query = {};
        var search= "";
        str.split('&').forEach((e)=>{
            var [key,value] = e.split('=');
            key   = key.trim();
            value = value ? value.trim() : "";
            if(key){
                query[key] = value;
            }
        });
        Object.keys(query).forEach((k,i)=>{
            if(i===0){
                search = `?${k}=${query[k]}`
            }else{
                search += `&${k}=${query[k]}`
            }
        })
        return {query, search};
    }
    req.urlObj = getUrl(decodeURI(req.url));
    next();
}

function init(obj = to){

    var fileID     = [];
    var globalData = {};

    const $home = obj.$home || to.$home;
    const $dwn  = obj.$dwn  || to.$dwn;
    const $upl  = obj.$upl  || to.$upl;

    var dwn = `/${$dwn}`;
    var upl = `/${$upl}`;
    
    log(obj)
    log("---------------")
    log({$home,$dwn,$upl,dwn,upl})

    fs.stat($home,0,(e)=>{
        if(e) throw `$home : { ${$home} } isn't exists`;
    });

    var app = Router();

    var url, query, dir, explorer, mode;

    app.use((req,res,next)=>{
        query    = req.query;
        url      = req.urlObj.url;

        dir      = query.dir;
        mode     = query.mode;
        explorer = query.explorer;
        next();
        // var {root, urlObj, query} = req;
        // log('----------------', {root,urlObj,query})
    })
    app.use("/explorer", static($home));

    app.use("/img", static(path.join(url_clients, "img")));
    app.use("/js" , static(path.join(url_clients, "js" )));
    app.use("/css", static(path.join(url_clients, "css")));

    app.get(['/', '/index', '/index.html', '/index.htm'], (req, res)=>{
        res.sendFile(path.join(url_clients, "/index.html"));
    })

    app.get(dwn, (req, res)=>{
        res.sendFile(path.join(url_clients, "/downloads.html"));
    })
    app.get(upl, (req, res)=>{
        res.sendFile(path.join(url_clients, "/uploads.html"));
    })

    app.get('/getid',(req,res)=>{
        if(mode == 1){
            var id = generateID("JZ-",[10,16],"--",globalData);
            res.json({id, status : "success"})
            globalData[id] = [];
        }else{
            res.json({status : "error"});
        }
    })
    app.get('/getinfo',(req,res)=>{
        res.json({dwn,upl});
    })

    app.post('/download', (req,res)=>{
        if(explorer){
            var purl = path.join($home,explorer === "/"?"":explorer);
            if(fs.existsSync(purl)){
                fs.readdir(purl,'utf8',(e,data)=>{
                    data = data.map((name)=>{
                        var p = path.join(purl,name)
                        var D = fs.statSync(p),
                            type = "";
                        if(D.isDirectory()){
                            type = "D";
                        }else{
                            type = "F";
                        }
                        return {type,name};
                    })
                    res.json({status:"success", data});
                });
            }else{
                res.json({status:"error",type:`this url (${explorer}) not exists`});
            }
        }else{
            res.json({status:"error",type:"key(explorer) required"});
        }
    })
    app.post('/upload',(req,res)=>{
        var dirObj = {};
        dirObj[dir] = {};
        newP.create($home,dirObj);

        var {data, name} = req.Jdata;
        var url = path.join($home,dir,name);
        fs.exists(url,(is)=>{
            if(!is){
                fs.writeFile(url,data,{encoding:"base64"},(e)=>{
                    if(e){
                        res.json({status:"error",type:"didn't create file"});
                    }else{
                        res.json({status:"success"});
                    }
                })
            }else{
                res.json({status:"error",type:"file exists"});
            }
        })
    })

    app.post('/delete', (req, res)=>{
        var {targit, type} = req.query;
        console.log({targit,type})
        if(targit && type){
            var p = path.parse(path.join($home, targit));
            child_process.exec(`cd ${p.dir} && rm ${type == "D"? "-rf":"-f"} ${p.base}`, (e, out, err)=>{
                if(!e){
                    console.log(`DELETED ${type === "D"? "directory":"file"} : ${path.format(p)}`);
                    res.send(out);
                }else{
                    console.error({e, out, err})
                    res.status(400);
                    res.send(err);
                }
            });
        }
    })

    app.post('/upload_step_by_step',(req,res)=>{
        if(req.Jdata){
            var {id,data,dir,name,status,encoding} = req.Jdata;
            if(!globalData[id]){
                res.json({status:'error',type:"file id deleted"});
                return;
            }
            globalData[id].push(data);
            globalData[id].time = Date.now();
            var {length} = globalData[id];
            // log({id,data,dir,name,status,encoding,length})
            if(status === "OK"){
                log({dir});
                dir = dir ? dir : "/";
                var dirObj  = {};
                dirObj[dir] = {};
                newP.create($home,dirObj);
                var p = path.join($home,dir,name);
                var alldata = globalData[id].join('');
                fs.writeFile(p,alldata,{encoding},(e)=>{
                    if(e){
                        res.json({status:'error',type:"file didn't created"})
                    }else{
                        res.json({status:"OK",type:'file created'})
                        delete globalData[id];
                    }
                })
            }else{
                res.json({status:"success",type:"data added"});
            }
        }else{
            res.json({status:"error",type:"there is no data sent"})
        }
    })
    app.post('/upload_step_by_step_use_file', (req,res)=>{
        
    })

    // app.post('/upload',(req,res)=>{})
    return app;
}

init.Url   = handelUrl;
init.JData = handeldata;

module.exports = init