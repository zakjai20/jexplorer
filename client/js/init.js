var log = console.log;
document.JCreate = function(){
    var [query,...arg] = arguments;
    var [el,...attr] = query.match(/((.*)\{.*\}|(\.|\#)?(.[^.#]*))/g);
    try{
        var [elem,txt]   = el.match(/(.*)\{(.*)\}/).slice(1);
    }catch{
        elem = el;
    }
    var node = document.createElement(elem);
    node.innerHTML = txt? txt:"";
    attr.forEach(e => {
        var type = e[0];
        var at   = e.slice(1);
        if(type === "."){
            node.classList.add(at);
        }else if(type === "#"){
            node.id = at;
        }
    });
    arg.forEach((e)=>{
        if(typeof e === "object"){
            var keys = Object.keys(e);
            keys.forEach((key)=>{
                if(key.toLocaleLowerCase() === "class"){
                    e[key].split(' ').forEach((c)=>{
                        node.classList.add(c.trim());
                    })
                }else{
                    node.setAttribute(key,e[key].toString());
                }
            });
        }
    })
    return node;
}
function JRequest(url,type,tr){
    var that = this;
    type = type ? type : "application/json;charset=UTF-8";
    tr = typeof tr === "undefined" ? true : tr; 
    var xhr = new XMLHttpRequest();
    xhr.onload = ()=>{
        var {responseType,response,status}=xhr;
        that.load({responseType,response,status});
    }
    this.get = (d,cb,restype)=>{
        if(typeof cb === "function"){
            this.load = cb;
        }
        xhr.responseType = restype || "";
        xhr.open('get',url,tr);
        xhr.setRequestHeader("Content-Type", type);
        return xhr.send(d);
    }
    this.post = (d,cb,restype)=>{
        if(typeof cb === "function"){
            this.load = cb;
        }
        xhr.responseType = restype || "";
        xhr.open('post',url,tr);
        xhr.setRequestHeader("Content-Type", type);
        return xhr.send(d);
    }
    this.load = ()=>{};
}
function getQuery(a){
    var lines = a.replace(/^\?/,"").split('&');
    var KV = {};
    var kv = lines.map((e)=>{
        return e.split('=').map((ee)=>ee.trim());
    });
    kv.forEach(([k,v])=>{
        KV[k]=v;
    });
    return a === "" ? {} : KV;
}

window.query = getQuery(decodeURI(window.location.search));
