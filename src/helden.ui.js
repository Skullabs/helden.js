/**
 * helden.js default UI extension
 * @author: Miere Liniel Teixeira <miere.teixeira@gmail.com>
 */
!function(){

	function wasDefined( value ){
		return ( value != undefined && value != null )
	}

	/**
	 * Defines if a view should be visible or not
	 */
	observable.extensions.visible = function( initialValue ){
		var isVisible = initialValue || false

		this.configure = function( view, model, value )
		{
			var method = function( v ){
				if ( wasDefined( v ) )
					setValue( v )
				return isVisible
			}

			function setValue( v ){
				if ( v == true )
					view.removeClass( 'hide' )
				else
					view.addClass( 'hide' )
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
	observable.extensions.focus = function(){

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
	observable.extensions.fadeout = function(){

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
	observable.extensions.fadein = function(){

		this.configure = function( view, model, value )
		{
			return function(){
				view.fadein.apply( view, arguments )
			}
		}
	}
}()