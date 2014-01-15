Ext.define('Ext.ux.form.FilterCombo', {
    extend: 'Ext.form.field.ComboBox',

    alias: 'widget.filtercombo',

    storeToFilter: null,
    currentFilter: null,
    afterLabelTextTpl: this.requiredText,
    //store: ["ALL","Automated","To be Automated","Needs Maintenance"],
    forceSelection: true,
    editable: false,
    allowBlank: false,
    allValue: "ALL",
    propertyName:null,
    listeners: {
        change: function(field, value){
            if(field.currentFilter != null){
                field.storeToFilter.removeFilter(field.currentFilter)
            }
            if(value == field.allValue) return;
            var filterFn = function(record){
                if (record.get(field.propertyName) == field.getValue()) return true;
            };
            field.currentFilter =  Ext.create('Ext.util.Filter', {
                filterFn: filterFn});

            field.storeToFilter.addFilter(field.currentFilter);
        }
    }

});