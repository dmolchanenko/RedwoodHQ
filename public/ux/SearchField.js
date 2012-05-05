Ext.define('Ext.ux.form.SearchField', {
    extend: 'Ext.form.field.Trigger',

    alias: 'widget.searchfield',

    trigger1Cls: Ext.baseCSSPrefix + 'form-clear-trigger',

    //trigger2Cls: Ext.baseCSSPrefix + 'form-search-trigger',

    hasSearch : false,
    paramNames : null,
    filterFn: null,
    enableKeyEvents:true,

    initComponent: function() {
        var me = this;


        this.filterFn = function(record,id){
            //console.log(id);
            var value = this.value;
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

                if ((value[i] == " ")&&(quoteFound == false)){
                    values.push(tempVal);
                    tempVal = "";
                    continue;
                }
                tempVal = tempVal + value[i];
                if (value.length == i+1){
                    values.push(tempVal);
                }
            }
            for(var pCount=0; pCount<this.paramNames.length; pCount++) {
                var paramValue = record.get(this.paramNames[pCount]);
                for (var valCount =0;valCount<values.length;valCount++){
                    //var matchValue = new RegExp("\\Q" +values[valCount] +"\\E.*");
                    //var matchValue = new RegExp("^"+values[valCount] +".*");
                    var matchValue = new XRegExp("^" + XRegExp.escape(values[valCount])+".*");
                    if ( Object.prototype.toString.call(paramValue)  === "[object Array]") {
                        for (var paramCount=0;paramCount<paramValue.length;paramCount++){
                            if(matchValue.test(paramValue[paramCount])){
                                return true;
                            }
                        }
                       // if (paramValue.indexOf(values[valCount]) != -1){
                       //     return true;
                       // }
                    }
                    else{
                        if (matchValue.test(paramValue)){
                            return true;
                        }
                    }
                }

            }

        };

        me.callParent(arguments);

        me.on('change',function(a,b,c,d){
            if (this.value == ""){
                me.onTrigger1Click();
            }else{
                me.onTrigger2Click();
            }
        });

        /*
        me.on('specialkey', function(f, e){
            if (e.getKey() == e.ENTER) {
                me.onTrigger2Click();
            }
            //if (e.getKey() == e.BACKSPACE) {
            //    me.onTrigger2Click();
            //}
            //if (e.getKey() == e.DELETE) {
            //    me.onTrigger2Click();
            //}
        });

        me.on('keyup',function(field,evt,eOpt){
            if (this.value == ""){
                me.onTrigger1Click();
            }else{
                me.onTrigger2Click();
            }
        });
        */
        // We're going to use filtering
        //me.store.remoteFilter = true;

        // Set up the proxy to encode the filter in the simplest way as a name/value pair

        // If the Store has not been *configured* with a filterParam property, then use our filter parameter name
        //if (!me.store.proxy.hasOwnProperty('filterParam')) {
        //    me.store.proxy.filterParam = me.paramName;
        //}
        me.store.proxy.encodeFilters = function(filters) {
            return filters[0].value;
        }
    },

    afterRender: function(){
        this.callParent();
        this.triggerCell.item(0).setDisplayed(false);
    },

    onTrigger1Click : function(){
        var me = this;

        if (me.hasSearch) {
            me.setValue('');
            me.store.clearFilter();
            me.hasSearch = false;
            me.triggerCell.item(0).setDisplayed(false);
            me.updateLayout();
        }
    },

    onTrigger2Click : function(){
        var me = this,
            store = me.store,
            //proxy = store.getProxy(),
            value = me.getValue();

        if (value.length > 0) {
            me.store.clearFilter();

            if (this.filterFn != null){
                me.store.filterBy(this.filterFn,me);
            }
            else{
                me.store.filter({
                    id: me.paramName,
                    property: me.paramName,
                    value: value
                });
            }
            me.hasSearch = true;
            me.triggerCell.item(0).setDisplayed(true);
            me.updateLayout();
        }
    }
});