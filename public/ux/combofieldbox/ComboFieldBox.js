
//====================
//   ComboFieldBox
//====================
 Ext.define('Ext.ux.ComboFieldBox',
    {extend : 'Ext.form.field.ComboBox', 
        alias : 'widget.combofieldbox', 
    multiSelect: true,
    /**
     * @maxHeight
     * maximum height for inputEl. 
     */
    maxHeight: 150,
    /**
     * @descField
     * name of field used for description/tooltip
     */
    descField: null,
    /**
     * cfg
     * config object passed to the view 
     * viewCfg: {},
     */
     /**
     * @createNewOnEnter {Boolean} createNewOnEnter
     * When forceSelection is false, new records can be created by the user. This configuration
     * option has no effect if forceSelection is true, which is the default.
     */
     createNewOnEnter: false,
     /**
     * @forceSelection {Boolean} forceSelection
     * override parent config. If force selection is set to false and    
     */
     forceSelection: true,

    fieldSubTpl: [
        '<div class="{hiddenDataCls}" role="presentation"></div>',
        '<div id="{id}"',
            '<tpl if="readOnly"> readonly="readonly"</tpl>',
            '<tpl if="disabled"> disabled="disabled"</tpl>',
            '<tpl if="tabIdx"> tabIndex="{tabIdx}"</tpl>',
            '<tpl if="name"> name="{name}"</tpl>',
            '<tpl if="fieldStyle"> style="{fieldStyle}"</tpl>',
            '<tpl if="placeholder"> placeholder="{placeholder}"</tpl>',
            '<tpl if="size"> size="{size}"</tpl>',
            'class="{fieldCls} {typeCls} x-boxselect" autocomplete="off" />',
        '</div>',
    {
        compiled: true,
        disableFormats: true
    }
    ],
    getSubTplData: function () {
        var me = this,
            fieldStyle = me.getFieldStyle(),
            ret = me.callParent();
        ret.fieldStyle = (fieldStyle || '') + ';overflow:auto;height:'+ (me.height ? (me.height + 'px;') : 'auto;') + (me.maxHeight ? ('max-height:' + me.maxHeight + 'px;') : '');
        return ret
    },
    
    alignPicker: function () {
        var me = this,
            picker = me.getPicker();
        me.callParent();
        if (me.isExpanded) {
            picker.setWidth(me.bodyEl.getWidth() - me.triggerWidth);
        }
    },
    initComponent: function () {
        var me = this;
        me.matchFieldWidth = false;
        me.getValueStore();
        me.listConfig = Ext.apply(me.listConfig || {}, {selModel: {mode: 'SIMPLE', enableKeyNav: false}});
        me.callParent();
    },
    setValueStore: function(store) {
        this.valueStore = store;
    },
    getValueStore: function() {
        var me = this;
         return me.valueStore || (me.valueStore = me.createValueStore());
    },
    createValueStore: function() {
        return this.valueStore = new Ext.data.Store({
                    model: this.store.model
            })
    },
    /**
    * get all valufield values from value store and re-set combobox values
    */
    setStoreValues: function() {
        var me = this, 
            st = me.getValueStore();
         me.setValue(st.data.extractValues(me.valueField || st.valueField, 'data'));
          me.syncSelection();   
    },
    getValueModels: function () {
        return this.valueModels || []
    },
    afterSetValue: function (){
        var me = this;
        me.valueStore.removeAll();
        me.valueStore.add(me.getValueModels());
        if (me.isExpanded) {
            me.onListRefresh()
        }
        if(me.inputEl) {me.setHeight(me.inputEl.getHeight())};
    },
    setValue: function (value, action) {
        var me = this;
        me.callParent([value, false]);
        me.afterSetValue();
        me.syncSelection();
    },
    getRawValue: function () {
        return Ext.value(this.rawValue, '');
    },
    onKeyUp: Ext.emptyFn,
    onBlur: function(e) {
        var me = this;
        /*
        var rawValue = e.target.value;
        if(!Ext.isEmpty(rawValue)) {
            var foundRec = me.store.findExact(me.valueField, rawValue);
            rec = {};
            rec[me.valueField] = rawValue;
            rec[me.displayField] = rawValue;
            if(foundRec < 0) {
                me.store.add(rec);
            }
            me.getValueStore().add(rec);
            me.setStoreValues();
        }
        */
    	me.view.inputEl.dom.value ='';
    }, 
    onFocus: function() {
    	var me = this;
    	me.callParent();
    	me.view.focus();
    },
    buildKeyNav: function() {
    	 var me = this,
            keyNav = me.listKeyNav,
            selectOnTab = me.selectOnTab,
            picker = me.getPicker();
	return  new Ext.view.BoundListKeyNav(picker.el, {
                boundList: picker,
                forceKeyDown: true,
                tab: function(e) {
                    if (selectOnTab) {
                        this.selectHighlighted(e);
                        me.triggerBlur();		
                    }
                    // Tab key event is allowed to propagate to field
                    return true;
                }, 
                esc: function(e) {
                	me.onTriggerClick()
                }
            });
    },
    onExpand: function() {
        var me = this,
            keyNav = me.listKeyNav,
            selectOnTab = me.selectOnTab,
            picker = me.getPicker();

        // Handle BoundList navigation from the input field. Insert a tab listener specially to enable selectOnTab.
        if (keyNav) {
            keyNav.enable();
        } else {
            keyNav = me.listKeyNav = me.buildKeyNav()
        }

        // While list is expanded, stop tab monitoring from Ext.form.field.Trigger so it doesn't short-circuit selectOnTab
        if (selectOnTab) {
            me.ignoreMonitorTab = true;
        }

        Ext.defer(keyNav.enable, 1, keyNav); //wait a bit so it doesn't react to the down arrow opening the picker
        picker.focus();
    },
    onCollapse: function() {
    	var me = this;
    	me.callParent();
    	me.view.focus();
    },
    afterComponentLayout : function() {
        var me = this,
        	//selectBoxOnTab = me.selectBoxOnTab,
        	move= function(index){
        		var nav = this,
                boundList = nav.boundList,
                allItems = boundList.all,
                oldItem = boundList.highlightedItem,
                oldItemIdx = oldItem ? boundList.indexOf(oldItem) : -1,
                newItemIdx = oldItemIdx < allItems.getCount() - 1 ? oldItemIdx + index : 0; //wraps around
            	nav.highlightAt(newItemIdx);
	        	me.view.focus()
            }, 
            del = function(e) {
            	if(me.readOnly || me.disabled || !me.editable) {return}
            	var nav = this,
                boundList = nav.boundList,
                item = boundList.highlightedItem,
                index;
                if(item) {
	                index = boundList.indexOf(item);
	                me.getValueStore().remove(boundList.getRecord(item));
					me.setStoreValues();
	                nav.highlightAt(index);
	                me.view.focus()
                }
            };
        me.callParent(arguments);
        if (!me.view) {
            me.view = new Ext.ux.ComboView(Ext.apply({
                store: me.valueStore,
                emptyText: me.emptyText || '',
                field: me,
                renderTo: me.inputEl
            }, me.viewCfg));
           boxKeyNav=  me.boxKeyNav = new Ext.view.BoundListKeyNav(me.view.el, {
                boundList: me.view,
                forceKeyDown: true,
                down : function(e) {
                	me.onTriggerClick()
                },
                right: function(e) {	
                	move.call(this, 1)
                },
                left: function(e) {
                	move.call(this, -1)
                },
                enter: function(e) {
                	if(me.readOnly || me.disabled || !me.editable) {return}
					if (me.multiSelect && me.createNewOnEnter == true && e.getKey() == e.ENTER  && (rawValue = e.target.value) && (!Ext.isEmpty(rawValue))) {
                        me.view.inputEl.dom.value ='';
						var foundRec = me.store.findExact(me.valueField, rawValue);
                        rec = {};
                        rec[me.valueField] = rawValue;
                        rec[me.displayField] = rawValue;
						if(foundRec < 0) {
						 me.store.add(rec);
						}
                        me.getValueStore().add(rec);
                        me.setStoreValues()
					}
					me.view.focus()
                },
                space:del,
                del:del
            });
            Ext.defer(boxKeyNav.enable, 1, boxKeyNav);
        }
    },
    onDestroy: function() {
        var me = this;
        if(me.view) {Ext.destroy(me.view, me.boxKeyNav)}
        me.callParent();
    }
});
