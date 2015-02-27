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

}()