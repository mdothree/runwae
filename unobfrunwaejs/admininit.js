params = paramFunction();
ini = init();
ini.populate();

function init() {
    const obj = {};
    obj.populate = function () {
        key = params.mainDisplay.types[0]
        //main display
        this.displayOptions(params.mainDisplay.types, params.mainDisplay.typeDisplay); //fill the types li
        this.displayOptions(params.mainDisplay[key].filters, params.mainDisplay.filterDisplay); //fill the filters cooresponding to the first var in type
        this.displayOptions(params.mainDisplay[key].sort, params.mainDisplay.sortDisplay); //fill the
        this.displayHeaders(params.mainDisplay[key].headers, params.mainDisplay.headerDisplay);
        //TOD plot
        this.displayOptions(params.vsTODPlot.filters, params.vsTODPlot.filterDisplay); //fill the filters cooresponding to the first var in type
        //Time plot
        this.displayOptions(params.vsTimePlot.filters, params.vsTimePlot.filterDisplay); //fill the filters cooresponding to the first var in type
        //displayc
        this.displayHeaders(params.visitingPagesDisplay.headers, params.visitingPagesDisplay.headerDisplay);
        this.displayHeaders(params.averagedDisplay.headers, params.averagedDisplay.headerDisplay);
    }

    obj.displayOptions = function (array, ul) {
        for (i in array) {
            displayHTML(params.filterOption.scriptDiv, ul, params.filterOption.before, [array[i]])
        }
        $(ul).attr("title",array[0])
    }
    obj.displayHeaders = function (array, ul) {
        for (i in array) {
            displayHTML(params.headerOption.scriptDiv, ul, params.headerOption.before, [array[i]])
        }
    }
    return obj;
}