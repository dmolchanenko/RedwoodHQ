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
                    var matchValue = new XRegExp("^" + XRegExp.escape(values[valCount])+".*");
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