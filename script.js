// Essentials
Function.prototype.bind=function(t){var n=this;return function(){n.apply(t)}},
Function.prototype.pass=function(t,n){var r=this;return function(){r.apply(n,t)}},
Object.prototype.each=function(t,n){for(var r in this)this.hasOwnProperty(r)&&t.apply(n||this,[this[r],r,this])},
Object.prototype.extend=function(t){for(var n in t)t.hasOwnProperty(n)&&(this[n]=t[n])},
Object.prototype.size=function(){var t,n=0;for(t in this)this.hasOwnProperty(t)&&n++;return n},
Array.prototype.each=function(t,n){for(var r=0;r<this.length;r++)t.apply(n||this,[this[r],r,this])};

// Some DOM helpers
function $(id){return document.getElementById(id)}
function $element(tag,options){
    var el = document.createElement(tag);
    options && options.each(function(val,key){
        switch(key){
            case 'style':
                el.style.extend(options.style);
                break;
            case 'content':
                el.innerHTML = val;
                break;
            default:
                el[key] = val;
        }
    });
    return el;
}

// Image preloader
function $preload(url){
    var preloader = $element('div',{
        className: 'image-preload',
        style: {
           background: 'url('+url+')'
        }
    });
    document.body.appendChild(preloader);
}

// Hanlde missing event info in some browsers
function __getEventClickOffset(event){
    if(this.offsetX !== undefined) return {x:event.offsetX,y:event.offsetY};
    else return {
        x: event.clientX - event.target.offsetLeft,
        y: event.clientY - event.target.offsetTop,
    }
}

// Ajax requests
var Request = {
    __onreadystatechange: function(request,onSuccess, onFail){
        return function(){
            if (request.readyState === 4) {
                if (request.status === 200)
                    onSuccess(request.responseText);
                else if(onFail !== undefined) 
                    onFail('Request returned status ' + request.status);
            }
        }
    },
    get: function(url, onSuccess, onFail){
        var request = new XMLHttpRequest();
        request.onreadystatechange = this.__onreadystatechange(request,onSuccess, onFail);
        request.open('GET', url);
        request.send();
    }
}

// Flickr API
var Flickr = {
    __baseUrl: 'https://api.flickr.com/services/rest/',
    __apiKey: '35b1457f9f5840f1fb0b06e97f9958da',
    __buildQuery: function(method,data){
        var query = [];

        data.extend({
            api_key: this.__apiKey,
            method: method,
            format: 'json',
            nojsoncallback: 1,
            content_type: 1 // Photos only
        })

        data.each(function(value,key){
            query.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        });

        return query.join('&');
    },
    __request: function(method,data,onSuccess,onFail){
        var query = this.__buildQuery(method,data);
        Request.get(this.__baseUrl + '?' + query, function(response){
            response = JSON.parse(response);
            if(response.stat == 'ok')
                onSuccess(response);
            else if(onFail !== undefined) 
                onFail('Flickr error: ' + response.message);
        },onFail);
            
    },
    search: function(string,onSuccess,onFail){
        this.__request(string?'flickr.photos.search':'flickr.photos.getRecent',{text:string},onSuccess,onFail);
    },
    getImageUrl: function(photo,suffix){
        url = 'https://farm'+photo.farm+'.staticflickr.com/'+photo.server+'/'+photo.id+'_'+photo.secret;
        if(suffix) url += '_' + suffix;
        return url + '.jpg';
    }
}

var Gallery = {
    photos: (function(){
        return (localStorage !== undefined) ? localStorage : {};
    })(),
    add: function(photo){
        this.photos[photo.id] = JSON.stringify(photo);
        $preload(Flickr.getImageUrl(photo,'c'))
        this.updateUi();
    },
    remove: function(id,el){
        delete this.photos[id];
        el.parentNode.removeChild(el);
        this.updateUi();
    },
    clear: function(){
        if(localStorage.clear !== undefined)
            localStorage.clear();
        else this.photos = {};
        this.updateUi();
        this.close();
    },
    updateUi: function(){
        var count = this.photos.size();
        $('show-gallery').innerHTML = 'Visa galleri' + (count ? ' (' + count + ')' : '');
        $('show-gallery').disabled = !count;
        $('gallery-count').innerHTML = parseInt(count) + ' bilder i galleriet';
    },
    close: function(){
        $('search-container').style.display = 'block';
        $('gallery-container').style.display = 'none';
        $('search-input').focus();
    },
    show: function(){
        $('gallery').innerHTML = '';
        $('search-container').style.display = 'none';
        this.photos.each(function(data){
            var data = JSON.parse(data);
            var photoEl = this.__createPhotoElement(data);
            photoEl.className += ' remove-overlay';
            photoEl.flickrId = data.id;
            photoEl.onclick = function(event){
                var offset = __getEventClickOffset(event);
                if(offset.x > 50 && offset.y > 50){
                    // Remove overlay clicked
                    Gallery.remove(this.flickrId,this);
                } else {
                    Gallery.display(this.flickrId);
                }
            }
            $('gallery').appendChild(photoEl);
        },this);
        $('gallery-container').style.display = 'block';
    },
    display: function(id){
        var photo = JSON.parse(this.photos[id]);
        var url = Flickr.getImageUrl(photo,'c');
        Modal.open(url);
    },
    __createPhotoElement: function(data){
        var url = Flickr.getImageUrl(data,'s');
        var photoEl = $element('div',{
            className: 'photo-thumb',
            title: data.title,
            style: {
                backgroundImage: 'url("' + url + '")'
            }
        });
        return photoEl;
    }
}

var Modal = {
    overlay: null,
    container: null,
    init: function(){
        var self = this;
        this.overlay = $element('div',{
            id: 'modal-overlay',
            onclick: this.close.bind(this)
        });
        document.body.appendChild(this.overlay);
        this.image = $element('img',{
            id:'modal-image'
        });
        this.overlay.appendChild(this.image);
    },
    open: function(url){
        this.image.src = url;
        this.overlay.style.display = 'block'
    },
    close: function(){
        this.overlay.style.display = 'none';
        this.image.src = '';
    }
}

var SearchButton = {
    start: function(){
        $('search-button').innerHTML = 'Söker...';
        $('search-button').disabled = true;        
    },
    done: function(){
        $('search-button').innerHTML = 'Sök';
        $('search-button').disabled = false;                
    }
}

// Event bindings
$('search-form').onsubmit =  function(){
    $('search-results').innerHTML = '';
    SearchButton.start();
    Flickr.search($('search-input').value,function(response){
        console.log(response);
        response.photos.photo.each(function(photo){
            var photoEl = Gallery.__createPhotoElement(photo);
            photoEl.className += ' add-overlay';
            photoEl.onclick = Gallery.add.pass([photo],Gallery)
            $('search-results').appendChild(photoEl);
        });
        SearchButton.done();
    },function(error){
        $('search-results').appendChild($element('div',{
            className: 'search-error',
            content: error
        }));
        SearchButton.done();
    });

    return false;
}
$('show-gallery').onclick = Gallery.show.bind(Gallery);
$('close-gallery').onclick = Gallery.close.bind(Gallery);
$('clear-gallery').onclick = Gallery.clear.bind(Gallery);

// Initialize things
Gallery.updateUi();
Modal.init();