/*
  jQuery UI Sortable plugin wrapper

  @param [ui-sortable] {object} Options to pass to $.fn.sortable() merged onto ui.config

  Authors:
  https://github.com/angular-ui
  2013, Lukas Dolezal dolezal@itlab.cz

  USAGE
  <ul 
    ng-model="items"
    ui-sortable="options"
    ui-sortable-enabled="enabled_expression"
    ui-sortable-start="on_start_expression"
    ui-sortable-stop="on_stop_expression"
  >
    <li>...</li>
    ...
  </ul>

  items - array  of items corresponding by index to elements in list
  options - options passed to jQuery UI sortable constructor
  enabled_expression - expression for determining of enabled/disabled state of sortable.
    enabled_expression is watched for change which calls enable or disable method of sortable
  on_start_expression - experssion evaluated when item is started sorting. useful for changing state
    of enabled_expression.
  on_stop_expression - expression evaluated when sorting is done.

  Note: when enabled state is changed after start, jQuery UI for some reason don't apply it. It causes
  that one can drop item to disabled connected sortlist. This directive handles it and reverts rightfully
  the original state.
*/
angular.module('ui.sortable', [])
.value('uiSortableConfig',{})
.directive('uiSortable', [ 'uiSortableConfig',
function(uiSortableConfig) {
return {
  require: '?ngModel',

  link: function(scope, element, attrs, ngModel) {
    function combineCallbacks(first,second){
      if( second && (typeof second === "function") ){
          return function(e,ui){
              var f = first(e,ui);
              if (!f) {
                return f;
              }
              return second(e,ui);
          };
      }
      return first;
    }

    var opts = {};

    var callbacks = {
        receive: null,
        remove:null,
        start:null,
        stop:null,
        update:null,
        over: null,
    };

    angular.extend(opts, uiSortableConfig);

    if (ngModel) {

      ngModel.$render = function() {
        element.sortable( "refresh" );
        //scope.$apply(attrs.uiSortableStop);
      };

      callbacks.start = function(e, ui) {
        scope.$apply(attrs.uiSortableStart);

        // Save position of dragged item
        ui.item.sortable = { index: ui.item.index() };
      };

      callbacks.update = function(e, ui) {
        // For some reason the reference to ngModel in stop() is wrong
        ui.item.sortable.resort = ngModel;
      };

      callbacks.receive = function(e, ui) {
        ui.item.sortable.relocate = true;

        // if receiving sortable is disabled
        if (element.sortable( "option", "disabled" )) {
          ui.item.sortable.cancelReceive = true;
          return;
        }
        
        // added item to array into correct position and set up flag
        ngModel.$modelValue.splice(ui.item.index(), 0, ui.item.sortable.moved);
      };

      callbacks.remove = function(e, ui) {
        // copy data into item
        if (ngModel.$modelValue.length === 1) {
          ui.item.sortable.moved = ngModel.$modelValue.splice(0, 1)[0];
        } else {
          ui.item.sortable.moved =  ngModel.$modelValue.splice(ui.item.sortable.index, 1)[0];
        }
      };

      callbacks.stop = function(e, ui) {
        console.log ("stop callback", ui);
        
        scope.$apply(attrs.uiSortableStop);

        // if was dragged to disabled sortable
        if (ui.item.sortable.cancelReceive) {
          // paste back to original
          ngModel.$modelValue.splice(ui.item.sortable.index, 0, ui.item.sortable.moved);
        } 

        // digest all prepared changes if resorted
        if (ui.item.sortable.resort && !ui.item.sortable.relocate) {

          // Fetch saved and current position of dropped element
          var end, start;
          start = ui.item.sortable.index;
          end = ui.item.index();

          // Reorder array and apply change to scope
          ui.item.sortable.resort.$modelValue.splice(end, 0, ui.item.sortable.resort.$modelValue.splice(start, 1)[0]);

        }
        if (ui.item.sortable.resort || ui.item.sortable.relocate) {
          scope.$apply();
        }
      };

    }

  scope.$watch(attrs.uiSortable, function(newVal, oldVal){
    angular.forEach(newVal, function(value, key){

        if( callbacks[key] ){
            // wrap the callback
            value = combineCallbacks( callbacks[key], value );
        }

        element.sortable('option', key, value);
    });
  }, true);

  angular.forEach(callbacks, function(value, key ){
      opts[key] = combineCallbacks(value, opts[key]);
  });

  // Create sortable
  element.sortable(opts);

  // watch changes to sortable enabled
  scope.$watch(attrs.uiSortableEnabled, function(newVal,oldVal) {
      if (newVal) {
        console.log("enabled");
        element.sortable('enable');
      } else {
        console.log("disabled");
        element.sortable('disable');
      }
    });
    
}
};
}
]);