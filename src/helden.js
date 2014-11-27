/**
 * helden.js heroically born two way binding
 * @author: Miere Liniel Teixeira <miere.teixeira@gmail.com>
 */
window.observable = (function(){

	// constants
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
			return new FormIDBinder( selector )
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
	function FormIDBinder( selector ) {
		this.selector = selector
		var model = {}

		this.configure = function( view ) {
			bindModelToView( view )
			return function( v ){
				if ( v ) model = v
				return model
			}
		}

		function bindModelToView( view ){
			view.find( "*[id]" )
				.each(function(){
					var defaultValue = this.value || model[ this.id ] || ""
					var m = new DomBinder().configure( $(this), model, defaultValue )
					model[ this.id ] = m
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
				return item
			}

			model.onRemove = function( index, item ){
				index = item.ID_ForEachBinder
				parent.find( "#" + index ).remove()
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
			return function(){
				return element.val.apply( element, arguments )
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
	var observable = function(){
		if ( arguments.length == 1 ) {
			if ( ( typeof arguments[0] ) == "string" )
				return new Observable( arguments[0] )
			return makeModelObservable( arguments[0] )
		}
		else if ( arguments.length == 2 )
			return makeModelObservable.apply( this, arguments )
		throw "Invalid syntax"
	}

	observable.extensions = extensions
	observable.util = {
		DomBinder: DomBinder,
		DomEventBinder: DomEventBinder,
		ForEachBinder: ForEachBinder,
		FormIDBinder: FormIDBinder,
		ObservableArray: ObservableArray
	}
	return observable
})()