Ext.define('Ext.ux.form.SearchField', {
    extend: 'Ext.form.field.Trigger',

    alias: 'widget.searchfield',

    trigger1Cls: Ext.baseCSSPrefix + 'form-clear-trigger',

    hasSearch : false,
    paramNames : null,
    filterFn: null,
    enableKeyEvents:true,

    initComponent: function() {
        var me = this;


        this.filterFn = function(record,id){
            var value = me.value;
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

                tempVal = tempVal + value[i];
                if (value.length == i+1){
                    values.push(tempVal);
                }
            }
            for(var pCount=0; pCount<me.paramNames.length; pCount++) {
                var paramValue = record.get(me.paramNames[pCount]);
                for (var valCount =0;valCount<values.length;valCount++){
                    var matchValue = new XRegExp(XRegExp.escape(values[valCount])+".*","i");
                    //var matchValue = new XRegExp("^" + XRegExp.escape(values[valCount])+".*","i");
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

        me.callParent(arguments);

        me.on('change',function(a,b,c,d){
            if (this.value == ""){
                me.onTrigger1Click();
            }else{
                me.onTrigger2Click();
            }
        });

        me.store.proxy.encodeFilters = function(filters) {
            return filters[0].value;
        }
    },

    afterRender: function(){
        this.callParent();
        this.triggerCell.item(0).setDisplayed(false);
    },

    currentFilter: null,

    onTrigger1Click : function(){
        var me = this;

        if (me.hasSearch) {
            me.setValue('');
            if(this.currentFilter != null){
                me.store.removeFilter(this.currentFilter);
            }
            me.hasSearch = false;
            me.triggerCell.item(0).setDisplayed(false);
            me.updateLayout();
        }
    },

    onTrigger2Click : function(){
        var me = this,
            value = me.getValue();

        if (value.length > 0) {
            if(this.currentFilter != null){
                me.store.removeFilter(this.currentFilter);
            }

            if (this.filterFn != null){
                this.currentFilter =  Ext.create('Ext.util.Filter', {filterFn: this.filterFn});
                me.store.addFilter(this.currentFilter);
            }
            else{
                this.currentFilter =  Ext.create('Ext.util.Filter', {id: me.paramName,
                    property: me.paramName,
                    value: value});
                me.store.addFilter(this.currentFilter);
            }
            me.hasSearch = true;
            me.triggerCell.item(0).setDisplayed(true);
            me.updateLayout();
        }
    }
});