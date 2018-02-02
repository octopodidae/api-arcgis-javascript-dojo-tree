require(
  ["esri/Map",
   "esri/views/MapView",
   "esri/request",
   "esri/layers/MapImageLayer",
   "esri/config",
   "esri/widgets/Legend",
   "dojo/_base/declare",
   "dojo/_base/window",
   "dojo/store/Memory",
   "dijit/tree/ObjectStoreModel",
   "dijit/Tree","dojo/domReady!"],
  function(	
    Map,
    MapView,
    esriRequest,
    MapLayer,
    esriConfig,
    Legend,
    declare,
    win,
    Memory,
    ObjectStoreModel,
    Tree)
  {

  let myBasemap;
  let mapView;
  let basemapsArr;
  let basemapList = document.getElementById("basemapList");
  let btnsDiv = document.getElementById("btnsDiv");
  let basemapsDiv = document.getElementById("basemapsDiv");
  let basemapBtns = document.getElementsByClassName("basemapBtn");
  let basemapCheckbox = document.getElementById("basemapCheckbox");
  let intialExtent = document.getElementById("intialExtent");
  let viewOptions;
  let url;
  let layer;
  let services;
  let toc = document.getElementById("toc");
  let map;
  let agsServers = document.getElementById("agsServers");
  let basemapChbox = document.getElementById("basemapChbox")
  let errorSpan = document.getElementById("errorSpan");
  let data = [];
  let parisExtent;
  let tree;
  let collapse = document.getElementById("collapse");
  let expand = document.getElementById("expand");
  let menu = document.getElementById("menu");
  
  esriConfig.request.corsEnabledServers.push("capgeo.sig.paris.fr");
  myBasemap = new Map( { basemap: "dark-gray" } );
  basemapsArr = ["osm", "topo", "streets", "satellite", "hybrid", "gray", "dark-gray", "streets-night-vector"];
  parisExtent = [2.339733839034574, 48.85789641531674];
  viewOptions = { container: "mapview", map: myBasemap, center: parisExtent, zoom: 12 };
  mapView = new MapView( viewOptions );
  let legend = new Legend({view: mapView});
  mapView.ui.add(legend, "bottom-right");
  intialExtent.style.display = "block";
	basemapChbox.style.display = "block";
  intialExtent.classList += " animated bounceInRight";
  basemapChbox.classList += " animated bounceInLeft";
  url = "https://capgeo.sig.paris.fr/arcgis/rest/services";

  menu.style.display = "block";
	menu.classList += " animated bounceInRight";
   
  data.unshift({id: "root", label: "<b>ROOT</b>"});

  function createData(url) {

    esriRequest(url + "?f=pjson", {
      responseType: "json"
    }).then(function(response){

      let result = response.data;

      let folders = result["folders"];

      if(folders.length > 0 ) {

        for (let i = 0, l = folders.length; i < l; i++)  {

          let label = "<b>" + folders[i].toUpperCase() + "</b>";
          let folderName = folders[i];

          esriRequest(url + "/" + folderName + "?f=pjson", { responseType: "json" })
            .then(function(response){

            let result = response.data;
            let services = result["services"];

            if ( result.services.length > 0 ) {

              data.push({ "id": folderName, "label": label, "parent": "root", "url": url+"/"+folderName });
              for (var i = 0, l = services.length; i < l; i++)  {
                let type = services[i].type;
                let label = services[i].name.split("/")[1];
                if ( type == "MapServer") {

                  data.push({"id": services[i].name, "label": label.toLowerCase(), "parent": folderName, "url": url+"/"+folderName+"/"+label+"/"+type});
                }
              }

            }
          })

        }
      }
    }).otherwise(errback);
  }

  // Executes if data retrieval was unsuccessful.
  function errback(error) {
    errorSpan.style.display = "inline";
    errorSpan.className += " animated flash";
    errorSpan.innerHTML = error.message;
  }

  createData(url);
  setTimeout(function(){createTree();}, 2000);

  function createTree() {

    // Create test store, adding getChildren() method needed by ObjectStoreModel
    let store = new Memory({
      data: data,
      getChildren: function(object){
        return this.query({parent: object.id});
      }
    });
    // Create the model
    let model = new ObjectStoreModel({
      store: store,
      query: {id: "root"},
      labelAttr: "label"
    });
    // Custom TreeNode class (based on dijit.TreeNode) that allows rich text labels
    let MyTreeNode = declare(Tree._TreeNode, {
      _setLabelAttr: {node: "labelNode", type: "innerHTML"}
    });
    // Create the Tree.
    tree = new Tree({
      model: model,
      _createTreeNode: function(args){
        return new MyTreeNode(args);
      }
    });

    tree.placeAt(document.getElementsByClassName("col")[0]);
    collapse.style.display = "inline";
    expand.style.display = "inline";
    expand.className += " animated flipInX";
    collapse.className += " animated flipInX";
    expand.className += " animated flipInX";
    tree.startup();

    tree.onClick = function(item){
      if( /MapServer$/.test(item.url)) {
        layer = new MapLayer( {url: item.url});
        if(layer.id) {
          mapView.map.removeAll();
          toc.innerHTML = "";
        }
        mapView.map.add(layer);
        setTimeout(function() { createChkBoxForSublayer(layer); }, 1000);
      }
    }
  }

  // Create checkbox for sublayers
  function createChkBoxForSublayer( layer ) {
    for (var i = 0, len = layer.sublayers.items.length; i < len; i++)  {
      let sublayer = layer.sublayers.items[i];
      let checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = sublayer.id;
      checkbox.id = "chk"+sublayer.id;
      checkbox.checked = sublayer.title;
      checkbox.classList.add("animated", "bounceInLeft");
      let label = document.createElement("label");
      label.textContent = sublayer.title;
      label.style.margin = "0px 10px";
      label.setAttribute("for", "chk"+sublayer.id);
      label.classList.add("animated", "bounceInRight")
      let br = document.createElement("br");
      toc.appendChild(checkbox);
      toc.appendChild(label);
      toc.appendChild(br);
      sublayerIsVisible(checkbox, sublayer);
    }
  }/**/

  // Sublayer visible or not when checkbox is checked or not
  function sublayerIsVisible(checkbox, sublayer) {
    checkbox.addEventListener( 'change', function() {
      if(this.checked) {
        sublayer.visible = true;
      } else {
        sublayer.visible = false;
      }
    });
  }

  // Go to initial extent
  intialExtent.onclick = function() {
    mapView.center = parisExtent;
    mapView.zoom = 12;
  }

  // Animate basemap button
  basemapCheckbox.onclick = function() {
    if(this.checked) {
      basemapsDiv.style.display = "block";
      btnsDiv.className = "animated flipInX";
      basemapList.style.display = "block";
      basemapList.className += " animated flipInX"
    }
    else
    {
      basemapsDiv.style.display = "none";
      btnsDiv.className = "";
      basemapList.style.display = "";
      basemapList.classList.remove("animated", "flipInX");
    }
  }

  // Change basemap when option in list change
  basemapList.onchange = function() {
    switch ( basemapList.value ) {
      case "osm":
        myBasemap.basemap = "osm";
        break;
      case "streets":
        myBasemap.basemap = "streets";
        break;
      case "topo":
        myBasemap.basemap = "topo";
        break;
      case "satellite":
        myBasemap.basemap = "satellite";
        break;
      case "hybrid":
        myBasemap.basemap = "hybrid";
        break;
      case "gray":
        myBasemap.basemap = "gray";
        break;
      case "dark-gray":
        myBasemap.basemap = "dark-gray";
        break;
      case "streets-night-vector":
        myBasemap.basemap = "streets-night-vector";
        break;
    }/**/
  }

  // Change basemap onclick button
  for (var i = 0, len = basemapBtns.length; i < len; i++) {
    let btnBsmap = basemapBtns[i];
    btnBsmap.addEventListener("click", function() {
      basemapList.value = this.id;
      myBasemap.basemap = this.id;
    });
  };/**/

  // Move the legend from left to right OR from right to left
  setTimeout(()=>{
    let myLegend = document.querySelector(".esri-legend");
    let divLegend = myLegend.parentElement;
    divLegend.onmouseover = () => {
      divLegend.style.cursor = "pointer";
    }
    divLegend.onclick = () => {
      divLegend.classList.toggle("esri-ui-bottom-left");
      divLegend.classList.toggle("esri-ui-bottom-right");
    }/**/
  }, 1000);
    
    collapse.onclick = function() {
      tree.collapseAll();
    }
    expand.onclick = function() {
      tree.expandAll();
    }
 
});