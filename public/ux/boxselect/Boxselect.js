/**
 * @class Ext.ux.form.field.BoxSelect
 * @extends Ext.form.field.ComboBox
 * 
 * BoxSelect for ExtJS 4, an extension of ComboBox that allows selecting and editing multiple values
 * displayed as labelled boxes within the field, as seen on facebook, hotmail and other sites.
 * 
 * The component started off as a port of BoxSelect for Ext 2 
 * (http://www.sencha.com/forum/showthread.php?134751-Ext.ux.form.field.BoxSelect), but eventually turned
 * into a complete rewrite adding better support for queryMode: 'remote' and 
 * better keyboard navigation and selection of values
 *   
 * @author kleins kleins@web.de
 * @requires BoxSelect.css
 * @xtype boxselect
 */
 
Ext.define('Ext.ux.form.field.BoxSelect', {
	extend: 'Ext.form.field.ComboBox',

	alias: 'widget.boxselect',
	
	selectedRecords: null, 
	
	items: null,
	
	selectionStartIdx: null,
	selectionEndIdx: null,
	
	stacked: false,
	
	initComponent:function() {
		Ext.apply(this, {
			hideTrigger: true,
			grow: true,
			multiSelect: false
		});
		
		this.selectedRecords = Ext.create('Ext.util.MixedCollection');
		this.items = Ext.create('Ext.util.MixedCollection');
		if (Ext.isDefined(this.displayTpl) && Ext.isArray(this.displayTpl)) {
			this.displayTpl = this.displayTpl.join('');
		}		
		this.callParent(arguments);		
	}, 	
	
	initEvents: function() {
		this.callParent();
		
		this.mon(this.inputEl, 'keypress', function(e) {
			this.autoSize();
			if (!e.isSpecialKey()) {
				this.deselectAll();
			}						
		}, this);
		this.mon(this.frame, 'keypress', this.onKeyPress, this);
		this.mon(this.frame, 'keydown', this.onKeyDown, this);
		this.mon(this.frame, 'click', function() {
			this.inputEl.focus()
		}, this);
		this.mon(this, 'resize', this.onResize, this);
	},
	
	onRender:function(ct, position) {
		// this.iAmRendered is necessary, because ext sets rendered = true in AbstractComponent.onRender
		// and not (as I believe it should) in AbstractComponent.render
		this.iAmRendered = false;
		
		this.callParent(arguments);		
		this.inputEl.removeCls('x-form-text');
		this.inputEl.setWidth(20);

        this.frame = this.inputEl.wrap({
            tag : 'ul',
            cls: 'boxselect x-form-text'
        });
        				
		if (this.stacked) {
			this.frame.addCls('stacked');
		}
				
		this.inputEl.wrap({
			tag: 'li'
		});
						
		this.store.on('load', function(store){
			this.store.each(function(rec){
				if(this.selectedRecords.containsKey(rec.get(this.valueField))){
					this.store.remove(rec);
				}
			}, this);
		}, this);
		
		this.iAmRendered = true;
		this.setRawValue(this.rawValue);		
	},
	
   preFocus : function(){
   		var isEmpty = false;
        if (Ext.isDefined(this.emptyText) && this.inputEl.dom.value === this.emptyText) {
            this.inputEl.dom.value = '';
            isEmpty = true;
            this.inputEl.removeCls(this.emptyCls);
        }
        if (this.selectOnFocus || isEmpty) {
            this.inputEl.dom.select();
        }
    },	
		
	onResize : function(w, h, rw, rh){
		this.callParent(arguments);
		this.frame.setWidth(w-4);
		this.autoSize();
	},
	
	getCursorPosition: function() {
	    if (Ext.isIE) {	    	
			rng=document.selection.createRange();
			rng.collapse(true);
			rng.moveStart("character", -this.inputEl.dom.value.length);
			cursorPos=rng.text.length;					    	
	    } else {
	        cursorPos = this.inputEl.dom.selectionStart;
	    }
		return cursorPos;
	},
	
	hasSelectedText: function() {
	    if (Ext.isIE) {
			var sel = document.selection;
			var range = sel.createRange();
			return (range.parentElement() == this.inputEl.dom);	    	
	    } else {
	    	return this.inputEl.dom.selectionStart != this.inputEl.dom.selectionEnd;
	    }		
	},
	
	onKeyDown: function(e) {
		// we only handle the event, if the focus is on an item
		// or the cursor at the beginning of the textfield
	    if (this.selectionStartIdx === null && this.getCursorPosition() !== 0) {
	    	return
	    }	
				
		if (e.getKey() ===Ext.EventObject.RIGHT) {
			if (this.selectionStartIdx !== null) {
				if (this.selectionStartIdx < this.items.getCount()-1) {
					this.selectionStartIdx++;
					
					this.items.getAt(this.selectionStartIdx).select(e.shiftKey);
				}
				else {
					this.items.each(function(item) {
						item.deselect();
					});
					this.selectionStartIdx = null;
					this.selectionEndIdx = null;
					this.inputEl.focus();
				}
				e.stopEvent();
			}
		}	
		else if (e.getKey() === Ext.EventObject.LEFT) {
			if (this.selectionStartIdx !== null) {
				 if (this.selectionStartIdx > 0) { 
					this.selectionStartIdx--;
				 }
			}
			else {
				this.selectionStartIdx = this.items.getCount()-1;
			}					
			this.items.getAt(this.selectionStartIdx).select(e.shiftKey)
			e.stopEvent();
		}
	},
	
	onKeyPress: function(e) {
		if (e.getKey() === 'a'.charCodeAt(0) && e.ctrlKey === true) {
			e.preventDefault();	
			this.selectionEndIdx = 0;
			this.items.each(function(item) {				
				item.select(true);
			});			
			this.inputEl.dom.value = '';
			this.selectionStartIdx = this.items.getCount()-1;
			e.stopEvent();
		}
		else if(e.getKey() === e.BACKSPACE && this.getCursorPosition() === 0 && !this.hasSelectedText()){
			// stop combobox default behaviour (opening the list)
			this.stopKeyUpEvent = true;
			this.collapse();
			
			this.inputEl.dom.value = '';
			
			// delete selected items or last item in list
			var noneSelected = true;
			this.items.each(function(item) {
				if (item.isSelected()) {
					item.dispose();
					noneSelected = false;
				}
			});
			if (noneSelected && this.items.getCount() > 0) {
				this.items.getAt(this.items.getCount()-1).dispose();					
			}
		}		
	},
	
	onKeyUp: function(e) {
		if (!Ext.isDefined(this.stopKeyUpEvent) || this.stopKeyUpEvent === false) {
			this.callParent(arguments);	
		}
		this.stopKeyUpEvent = false;
	},
	
	deselectAll: function() {	
		this.items.each(function(item) {
			item.deselect();
		});
		this.selectionStartIdx = null;
		this.selectionStartIds = null;
	},
	
	onListSelectionChange: function(list, selectedRecords) {
		if (selectedRecords.length < 1) {
			return;
		}
		
		this.inputEl.dom.value = '';
		Ext.each(selectedRecords, function(record) {		
			this.selectedRecords.add(record.data[this.valueField], record);
			this.store.remove(record);
								
			this.displayTplData = record.data;								
			this.addItem(record.data[this.valueField], this.getDisplayValue());
		}, this);

		Ext.defer(this.collapse, 1, this);
	},	    
		
	/**
	 * the mixed-type value is an array of values (for this.valueField), model instances or JSON objects
	 * with model data 
	 */
	valueToRaw: function(value) {
		var rawValues = [];
		
		Ext.each(value, function(record) {
			if (record.isModel) {
				rawValues.push(record.get(this.valueField))
			}
			else if (Ext.isObject(record)) {
				rawValues.push(record[this.valueField]);
			}
			else {
				rawValues.push(record);
			}
		}, this);
		
		return rawValues.join(',');
	},

	rawToValue: function(rawValue) {
		var rawValues = rawValue.split(',');

		var values = [];			
		Ext.each(rawValues, function(rawValue) {
			var record = this.store.findRecord(this.valueField, rawValue);
			if (record !== null) {
				values.push(record);
			}
		}, this);
		
		return values;
	},
	
	getValue: function(){
		return this.getRawValue();		
	},
	
	getRawValue: function() {		
		if (Ext.isDefined(arguments.callee.caller.$owner) && arguments.callee.caller.$owner.xtype === 'combobox') {
			return this.callParent();
		}
		else {
			return this.valueToRaw(this.selectedRecords.items);
		}
	},
		
    // loadFromRemoteStore specifies to load values from a remote store
    // if queryMode === 'remote' and the values are not in the currently loaded subset	
	setRawValue: function(rawValue, loadFromRemoteStore) {
		if (Ext.isDefined(arguments.callee.caller.$owner) && arguments.callee.caller.$owner.xtype === 'combobox') {
			return this.callParent(arguments);
		}
		else {
	        rawValue = Ext.value(rawValue, '');
	        this.rawValue = rawValue;
	        var values;
	        if (Ext.isEmpty(this.rawValue)) {
	        	values = [];
	        }
	        else {
				values = this.rawValue.split(',');
	        }
			
	        if (this.iAmRendered) {
	        	this.inputEl.dom.value = '';
	        	if(!Ext.isEmpty(values)) {
			        if (Ext.isDefined(this.emptyText)) {
			            this.inputEl.removeCls(this.emptyCls);
			        }			        	
					this.removeAllItems();
		        	if (this.store.isLoading()) {		        		
		        		this.store.on('load', function() {
		        			this.setRawValue(values.join(','));
		        		}, this, {single: true});
		        	}
		        	else {
						this.resetStore();
						if (!Ext.isDefined(loadFromRemoteStore)) {
							loadFromRemoteStore = true;			
						}		
						Ext.each(values, function(value) {
							if (!this.selectedRecords.containsKey(value)) {
								var record = this.store.findRecord(this.valueField, value);
								if (record === null) {
									// in remote mode the record might simply not be loaded
									// if we have already tried loadRemoteStore will be false
						            if (this.queryMode !== 'local' && loadFromRemoteStore) {
						            	var params = {};
						            	params[this.valueField] = values.join(',');            	
						            	this.store.load({
						            		params: params,
						            		callback: function() {
						            			this.setRawValue(values.join(','), false);	
						            		},
						            		scope: this
						            	});		       
						            	return false;
						            }					
									return;
								}
								this.selectedRecords.add(value, record);
								this.store.remove(record);
								
								this.displayTplData = record.data;								
								this.addItem(record.data[this.valueField], this.getDisplayValue());
							}		
						}, this);								
		        	}		        	
	        	}	
	        	else {
	        		this.removeAllItems();
	        		this.resetStore();      		
	        	}	        	        
	        }
		}
	},
	
	setValue: function(value) {
		value = Ext.value(value, []);
		this.setRawValue(this.valueToRaw(value));
		this.applyEmptyText();
	},
	
    applyEmptyText : function(){
        if (this.iAmRendered && Ext.isDefined(this.emptyText)) {
            if (this.selectedRecords.getCount() < 1 && !this.hasFocus) {
                this.inputEl.dom.value = this.emptyText;
                this.inputEl.addCls(this.emptyCls);
            }

            this.autoSize();
        }
    },
  
    /**
     * returns the box items that are selected (highlightes)
     */
	getSelectedItems: function() {
		if (this.selectionStartIdx === null) {
			return [];
		}
		else {
			return Ext.Array.slice(this.items.items, this.selectionStartIdx, this.selectionEndIdx+1);
		}
	},	
		
	removeAllItems: function(){
		this.items.each(function(item) {
			item.dispose(true);
		});
		this.items.clear();
	},
	
	resetStore: function(){
		if (this.selectedRecords.getCount() === 0) {
			return;
		}
		this.selectedRecords.each(function (rec) {
			this.store.add(rec);
		}, this);
		this.selectedRecords.clear();
		this.store.sort();
	},
	
	onItemSelected: function(item, addToSelection) {
		this.selectionStartIdx = this.items.indexOf(item);				
		
		if (!addToSelection) {
			this.items.each(function(otherItem) {
				if (otherItem !== item) {
					otherItem.deselect();
				}
			});			
			this.selectionEndIdx = this.selectionStartIdx;
		}
		else {
			if (this.selectionEndIdx === null) {
				this.selectionEndIdx = this.selectionStartIdx;
			}
			var start = Math.min(this.selectionEndIdx, this.selectionStartIdx);
			var end = Math.max(this.selectionEndIdx, this.selectionStartIdx);
			this.items.each(function(otherItem) {
				if (otherItem === item) {
					return;
				}
				if (start <= this.items.indexOf(otherItem) && this.items.indexOf(otherItem) <=
				end) {		
					otherItem.suspendEvents(); // avoid the event being triggered again
					otherItem.select();
					otherItem.resumeEvents();
				}
				else {
					otherItem.deselect();
				}						
			}, this);
		}					
	},
	
	onItemDisposed: function(item){
		if (this.selectedRecords.containsKey(item.value)) {
			this.store.insert(0, this.selectedRecords.get(item.value));
			this.selectedRecords.removeAtKey(item.value);
			this.store.sort();
			this.items.remove(item);						
		}
	},
		
	addItem: function(value, caption){
		var item = Ext.create('Ext.ux.form.field.BoxSelect.Item', {
			caption: caption,
			disabled: this.disabled,
			value: value,
			listeners: {
				'dispose': this.onItemDisposed,
				'select': this.onItemSelected,
				scope: this
			}
		});
		item.render(this.frame, this.frame.dom.childNodes.length-1);

		this.items.add(value, item);
		this.ownerCt.doLayout(); // in case height has changed (it doesn't work automatically in some cases)
	},
	
	autoSize : function(){
		if(!this.iAmRendered){
			return;
		}
		
		if(!this.metrics){
			this.metrics = Ext.create('Ext.util.TextMetrics', this.inputEl);
		}
		var w = Math.max(this.metrics.getWidth(this.inputEl.dom.value + ' ') +  15, 15);		
		this.inputEl.setWidth(w);
		
		if(Ext.isIE){
			this.inputEl.dom.style.top='0';
		}
	},
	
	onEnable: function(){
		this.callParent(arguments);
		this.items.each(function(item) {
			item.enable();
		});
	},

	onDisable: function(){
		this.callParent(arguments);
		this.items.each(function(item) {
			item.disable();
		});
	},
	
	/** overrides combobox to align to bodyEl instead of inputel **/
    alignPicker: function() {
        var me = this,
            picker, isAbove,
            aboveSfx = '-above';

        if (this.isExpanded) {
            picker = me.getPicker();
            if (me.matchFieldWidth) {
                // Auto the height (it will be constrained by min and max width) unless there are no records to display.
                picker.setSize(me.bodyEl.getWidth(), picker.store && picker.store.getCount() ? null : 0);
            }
            if (picker.isFloating()) {
                picker.alignTo(me.bodyEl, me.pickerAlign, me.pickerOffset);

                // add the {openCls}-above class if the picker was aligned above
                // the field due to hitting the bottom of the viewport
                isAbove = picker.el.getY() < me.inputEl.getY();
                me.bodyEl[isAbove ? 'addCls' : 'removeCls'](me.openCls + aboveSfx);
                picker.el[isAbove ? 'addCls' : 'removeCls'](picker.baseCls + aboveSfx);
            }
        }
    }
});

Ext.define('Ext.ux.form.field.BoxSelect.Item', {
	extend: 'Ext.Component',
	
	disabledCls: '', // to avoid applying opacity twice
	autoEl: {
		tag: 'li',
		cls: 'item-box'
	},
	renderTpl: ['{caption}<div class="deletebutton"><!-- --></div>'],

	onRender: function(ct, position){
		Ext.applyIf(this.renderData, {
			caption: this.caption
		});
		this.callParent(arguments);
		
		this.addEvents('dispose', 'select');

		this.el.addClsOnOver('bit-hover');
		
		this.deleteBtn = this.el.down('div.deletebutton');
	},	
	
	initEvents: function() {
		if (!this.disabled) {
			this.enableEvents();
		}
	},
	
	enableEvents: function() {
		this.mon(this.el, 'mousedown', this.onClick, this)
		this.mon(this.deleteBtn, 'mousedown', this.onDeleteClick, this)		
	},
	
	disableEvents: function() {
		this.mun(this.el, 'mousedown', this.onClick, this)
		this.mun(this.deleteBtn, 'mousedown', this.onDeleteClick, this)				
	},
	
	onEnable: function() {
		this.enableEvents();
	},

	onDisable: function() {
		this.disableEvents();
	},	
	
	onClick : function(e){
		e.stopEvent();
		this.select(e.shiftKey);
	},

	onDeleteClick : function(e){
		e.stopEvent();
		this.dispose();
	},		
	
	select: function(addToSelection) {
		if (!Ext.isDefined(addToSelection)) {
			addToSelection = false;
		}
		this.el.addCls('item-box-selected');
		this.fireEvent('select', this, addToSelection);
	},
	
	deselect: function() {
		this.el.removeCls('item-box-selected');
	},
	
	isSelected: function() {
		return this.el.hasCls('item-box-selected');
	},		
	
	dispose: function(withoutEffect) {
		if(withoutEffect){
			this.destroy();
		}
		else{
			this.el.hide({
				duration: 300,
				listeners: {
					lastframe: Ext.bind(function(){
						this.destroy()
					}, this)
				}
			});
		}
		
		this.fireEvent('dispose', this);		

		return this;
	}
});