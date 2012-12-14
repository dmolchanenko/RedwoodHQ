Ext.define('Ext.ux.SearchPlugin', {
    alias: 'plugin.ux.searchplugin',

    init: function(field) {
        field.filterFn = function(record,id){
            var value = field.getValue();
            if (value == null) return true;
            var values = [];
            var tempVal = "";
            var quoteFound = false;
            for(var i=0;i<value.length;i++){
                //start quote
                if((value[i] == '"')&&(quoteFound == false)){
                    quoteFound = true;
                    continue;
                }

                //end quote
                if((value[i] == '"')&&(quoteFound == true)){
                    quoteFound = false;
                    values.push(tempVal);
                    tempVal = "";
                    continue;
                }

                /*
                if ((value[i] == " ")&&(quoteFound == false)){
                    values.push(tempVal);
                    tempVal = "";
                    continue;
                }
                 */
                tempVal = tempVal + value[i];
                if (value.length == i+1){
                    values.push(tempVal);
                }
            }
            for(var pCount=0; pCount<field.paramNames.length; pCount++) {
                var paramValue = record.get(field.paramNames[pCount]);
                for (var valCount =0;valCount<values.length;valCount++){
                    var matchValue = new XRegExp("^" + XRegExp.escape(values[valCount])+".*","i");
                    if ( Object.prototype.toString.call(paramValue)  === "[object Array]") {
                        for (var paramCount=0;paramCount<paramValue.length;paramCount++){
                            if(matchValue.test(paramValue[paramCount])){
                                return true;
                            }
                        }
                    }
                    else{
                        if (matchValue.test(paramValue)){
                            return true;
                        }
                    }
                }

            }

        };
    }

});