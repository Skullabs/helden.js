/**
 * helden.js heroically born two way binding
 * @author: Miere Liniel Teixeira <miere.teixeira@gmail.com>
 */
window.helden = (function(){

	// constants
	var DO_NOTHING = function(){}
	var BINDABLE_ELEMENTS = [ "BUTTON", "INPUT", "TEXTAREA", "SELECT" ]
	var extensions = {}

	/**
	 * The Obserable API
	 */
	function Observable( selector ) {

		/**
		 * A reflective constructor instantiator
		 */
		function construct(constructor, args) {
			function F() {
				constructor.apply(this, args);
			}
			F.prototype = constructor.prototype;
			return new F();
		}

		/**
		 * Bind all input/textarea/select/radio/checkbox ids found inside nodes retrieved by current selector
		 */
		this.bindIds = function(){
			return new FormBinder( selector )
		}

		/**
		 * Bind all input/textarea/select/radio/checkbox names found inside nodes retrieved by current selector
		 */
		this.bindNames = function(){
			return new FormBinder( selector, "name" )
		}

		/**
		 * Bind all ids found inside nodes retrieved by current selector
		 */
		this.forEach = function( model ){
			return new ForEachBinder( selector, model )
		}

		/**
		 *
		 */
		this.bind = function(){
			if ( arguments.length == 2 )
				return new DomEventBinder( selector, arguments[0], arguments[1] )
			return new DomBinder( selector )
		}

		for ( var attr in extensions ){
			this[ attr ] = function( attr ){
					return function(){
						var ext = construct( extensions[attr], arguments )
						ext.selector = selector
						return ext
				}
			}( attr )
		}
	}

	/**
	 * observable implementation of array
	 */
	function ObservableArray( onAdd, onRemove ){
		this.onAdd = onAdd
		this.onRemove = onRemove
		this.length = 0
		var counter = 0
		var array = []

		this.get = function( index ) {
			return array[ index ]
		}
		this.push = function( item ) {
			var index = counter++
			var nitem = this.onAdd.call( array, index, item )
			array.push.call( array, nitem )
			this.length = array.length
		}
		this.remove = function( item ){
			var index = array.indexOf( item );
			return this.removeAt( index )
		}
		this.removeAt = function( index ){
			if ( index >= 0 ) {
				var item = array[ index ]
				array.splice( index, 1 )
				this.length = array.length
				this.onRemove.call( array, index, item )
			}
		}
		this.reset = function( arr ){
			for ( var i=0; i<this.length; i++ )
				this.remove( array[i] )
			for ( var i=0; i<arr.length; i++ )
				this.push( arr[i] )
		}
		this.sort = function( sortBy ) {
			array.sort( sortBy )
			this.onSort.call( array )
		}
		this.sortByKey = function( keyCallback ) {
			this.sort( compareByKey( keyCallback ) )
		}
	}

	function compareByKey( keyCallback ) {
		return function( a, b ) {
			var aKey = keyCallback( a )
			var bKey = keyCallback( b )
			if (aKey > bKey)
				return -1;
			if (aKey < bKey)
				return 1;
			return 0;
		}
	}

	/**
	 * Make the elements from a form bind its ID's elements against a model.
	 */
	function FormBinder( selector, attribute ) {
		this.selector = selector
		var model = {}
		attribute = attribute || "id"

		this.configure = function( view ) {
			bindModelToView( view )
			return function( v ){
				if ( v ) model = v
				return model
			}
		}

		function bindModelToView( view ){
			view.find( "*["+ attribute +"]" )
				.each(function(){
					var defaultValue = (this.type == "checkbox" ? this.checked : this.value) || model[ this[attribute] ] || ""
					var m = new DomBinder().configure( $(this), model, defaultValue )
					model[ this[attribute] ] = m
				})
		}
	}

	/**
	 * Bind a view against an array of observable model.
	 */
	function ForEachBinder( selector, templateModel ) {
		this.selector = selector

		var name = selector.replace(/[^a-zA-Z0-9]/g, '')
		var model = new ObservableArray()
		var onChange = DO_NOTHING

		this.onChange = function( callback ){
			if ( !isFunction( callback ) )
				throw "Callback should be a function"
			onChange = callback.bind( model )
			return this
		}

		this.configure = function( view, originalModel, defaultValue, parentModel ) {

			var parent = view.parent()
			var template = view.clone()
			view.remove()

			model.onAdd = function( index, item ){
				var clone = template.clone()
				item.ID_ForEachBinder = name + index
				clone.attr( "id", name + index )
				makeModelObserveAView( templateModel, clone, item, originalModel )
				parent.append( clone )
				onChange( parentModel )
				return item
			}

			model.onRemove = function( index, item ){
				index = item.ID_ForEachBinder
				parent.find( "#" + index ).remove()
				onChange( parentModel )
			}

			model.onSort = function() {
				var current = null, last = null
				for ( var i=0; i<this.length; i++ ){
					var item = this[i]
					var index = item.ID_ForEachBinder
					current = parent.find( "#" + index )
					if ( last == null )
						parent.prepend( current )
					else
						last.after( current )
					last = current
				}
				onChange( parentModel )
			}

			return function( v ){
				if ( v )
					model.reset( v )
				return model
			}
		}
	}

	/**
	 * Make dom selected nodes binded against an observable model.
	 */
	function DomBinder( selector ) {
		this.selector = selector

		this.configure = function( element, model, value ) {
			var method = isTwoWayBindable( element )
				? makeTwoWayBindable( element )
				: makeOneWayBindable( element )
			if ( !isFunction( value ) )
				method( value )
			return method;
		}

		function makeTwoWayBindable( element ) {
			return ( element.attr("type") == "checkbox" )
				? makeCheckboxTwoWayBindable( element )
				: makeInputsTwoWayBindable( element )
		}

		function makeInputsTwoWayBindable( element ) {
			return function(){
				return element.val.apply( element, arguments )
			}
		}

		function makeCheckboxTwoWayBindable( element ) {
			return function( value ) {
				if ( value == undefined )
					return element.prop( "checked" )
				return element.prop( "checked", value )
			}
		}

		function makeOneWayBindable( element ) {
			return function(){
				return element.text.apply( element, arguments )
			}
		}

		function isTwoWayBindable( element ){
			return BINDABLE_ELEMENTS.indexOf( element.prop("nodeName").toUpperCase() ) >= 0
		}
	}

	/**
	 * Make a dom node listen to events and attach a callback to it
	 */
	function DomEventBinder( selector, event, callback ){
		this.selector = selector

		this.configure = function( view, model, defaultValue, parentModel ){
			function eventCallback(){
				var args = [ view, parentModel ]
				for ( var i=0;i<arguments.length; i++ )
					args.push( arguments[i] )
				return callback.apply( model, args )
			}
			view.on( event, eventCallback )
			return eventCallback
		}
	}

	function makeModelObservable( model, selector ) {
		var view = selector ? $( selector ) : $( "body" )
		return makeModelObserveAView( model, view )
	}

	function makeModelObserveAView( model, view, target, parentModel ){
		target = target || model
		for ( var attr in model ) {
			var obj = model[attr]
			var defaultValue = target[attr]
			defaultValue = defaultValue == obj ? null : defaultValue
			if ( obj && isFunction( obj.configure ) ) {
				var objview = obj.selector ? view.find( obj.selector ) : view
				var resp = obj.configure( objview, target, defaultValue, parentModel )
				resp.$ = objview
				target[attr] = resp
			}
		}
		return target
	}

	function isFunction( obj ) {
		return (typeof obj) == 'function'
	}

	/**
	 * Exposed 'observable' API
	 */
	var select = function(){
		if ( arguments.length == 1 && ( typeof arguments[0] ) == "string" )
			return new Observable( arguments[0] )
		else if ( arguments.length == 2 )
			return makeModelObservable.apply( this, arguments )
		throw "Invalid syntax"
	}
	select.extensions = extensions

	var helden = {
		select: select,
		observable: makeModelObservable,
		util: {
			DomBinder: DomBinder,
			DomEventBinder: DomEventBinder,
			ForEachBinder: ForEachBinder,
			FormBinder: FormBinder,
			ObservableArray: ObservableArray
		}
	}
	return helden
})()

if ( !window.observable )
	window.observable = helden.observable
if ( !window.select )
	window.select = helden.select
/**
 * helden.defaults.js - default extensions that comes with core.
 * @author: Miere Liniel Teixeira <miere.teixeira@gmail.com>
 */
!function(){

	/**
	 * Defines if a view should be visible or not
	 */
	helden.select.extensions.bindAttr = function( attr ){
		
		if ( !attr )
			throw "Invalid binded attribute '" + attr + "'"

		this.configure = function( view, model, value )
		{
			var method = function( newValue ){
				if ( wasDefined( newValue ) )
					model.attr( attr, newValue )
				return model.attr( attr )
			}

			if ( wasDefined( value ) )
				method( value )

			return method
		}
	}

}()/**
 * helden.js default UI extension focused on JQuery/Zepto API.
 * @author: Miere Liniel Teixeira <miere.teixeira@gmail.com>
 */
!function(){

	function wasDefined( value ){
		return ( value != undefined && value != null )
	}

	/**
	 * Defines if a view should be visible or not
	 */
	helden.select.extensions.visible = function( initialValue ){
		var isVisible = initialValue || false

		this.configure = function( view, model, value )
		{
			var method = function( v ){
				if ( wasDefined( v ) )
					setValue( v )
				return isVisible
			}

			function setValue( v ){
				var m = ( v == true )
					? view.show : view.hide
				m.call( view )
				isVisible = v
			}

			value = wasDefined( value ) ? value : isVisible
			method( value )
			return method
		}
	}

	/**
	 * Force a focus into an form element
	 */
	helden.select.extensions.focus = function(){

		this.configure = function( view, model, value )
		{
			return function(){
				view.focus()
			}
		}
	}

	/**
	 * Apply fadeout effect in dom element
	 */
	helden.select.extensions.fadeout = function(){

		this.configure = function( view, model, value )
		{
			return function(){
				view.fadeout.apply( view, arguments )
			}
		}
	}

	/**
	 * Apply fadein effect in dom element
	 */
	helden.select.extensions.fadein = function(){

		this.configure = function( view, model, value )
		{
			return function(){
				view.fadein.apply( view, arguments )
			}
		}
	}
}()