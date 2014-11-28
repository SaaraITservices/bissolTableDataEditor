
// icons
var removeIcon = '<span class="glyphicon glyphicon-minus-sign remove-row" data-toggle="modal" data-target="#myDeleteModal"></span>';
//var addIcon = '<span class="glyphicon glyphicon-plus-sign add-row"></span>';
var saveIcon = '<span class="glyphicon glyphicon-floppy-disk save-row" data-toggle="modal" data-target="#myUpdateModal"></span>';
var editIcon = '<span class="glyphicon glyphicon-pencil save-row"></span>';

// font-awesome icons: added fa-fw for fixed width
// var addIcon = '<i class="fa fa-plus-square fa-fw"></i>'; // two options: fa-plus-square or fa-plus
// var editIcon = '<i class="fa fa-pencil fa-fw"></i>';
// var saveIcon = '<i class="fa fa-save fa-fw"></i>';
// var deleteIcon= '<i class="fa fa-times fa-fw"></i>'; // two options: fa-times or fa-trash


function bissolFetchConfigServerSide(conf){
    
    var config = JSON.parse(conf);
    
    // for backwards compatibility add new attributes which might not be in old configs and are required now
    if(typeof config.editorType === 'undefined') config.editorType = 'simple';

    Dashboards.setParameter('param_config', config);
    
    var myIdColumn = '';
    var myColIsAutoIncrement = '';
    var myColNamesVisible = [];
    
    config.metadata.forEach(function(elt, i) {
        if(elt.isPrimaryKey) myIdColumn = elt.colName;
        if(elt.isVisible) myColNamesVisible.push(elt.colName);
        if(elt.isAutoIncrement) myColIsAutoIncrement = elt.colName;
    });
    
    var mySchemaAndTable = '';
    if(config.dbSchema !== ''){
        mySchemaAndTable = config.dbSchema + '.' + config.dbTable;
    } else {
        mySchemaAndTable = config.dbTable;
    }

    
    var myMaxIdQuery = "SELECT MAX(" + myIdColumn + ") AS max_id FROM " + mySchemaAndTable;
    var myGenericSelectQuery = "SELECT " + myColNamesVisible.join(',') + " FROM " + mySchemaAndTable;
    
    
    // make config values available globally by storing their values in parameters
    Dashboards.setParameter('param_db_connection', config.dbConnection);
    Dashboards.setParameter('param_db_schema', config.dbSchema);
    Dashboards.setParameter('param_db_table', config.dbTable);
    Dashboards.setParameter('param_sql_max_id', myMaxIdQuery);
    Dashboards.setParameter('param_id_column', myIdColumn);
    Dashboards.setParameter('param_is_auto_increment', myColIsAutoIncrement);
    Dashboards.setParameter('param_db_schematable', mySchemaAndTable);
        
    Dashboards.fireChange('param_sql_select', myGenericSelectQuery);
    
}

function bissolBuildTable(data) {
    // no reason to define param_config_id as a function arguement as it is already set as a parameter value

    var myData = data;
    
    // empty in case table already exists
    $('#html_table_editor').empty();
    $('#html_new_record').empty(); 
    
    // create modals
    bissolCreateModal(
        'body'
        , 'myDeleteModal'
        , 'Deletion'
        , 'Do you really want to delete this record?'
        , 'myDeleteButton'
        , 'Delete'
    );
    
    bissolCreateModal(
        'body'
        , 'myUpdateModal'
        , 'Update'
        , 'Do you really want to update this record?'
        , 'myUpdateButton'
        , 'Update'
    );
   
    // prepare table basic structure
    $('#html_table_editor').append('<table id="myTableEditor" class="display"><thead><tr></tr></thead><tbody></tbody></table>');

    // add table header cells
       
    param_config.metadata.forEach(function(elt, i) {
        if(elt.isVisible){
            $('#html_table_editor table > thead > tr').append('<th>' + elt.colName + '</th>');
        }    
    });
    
    var contentEditable = '';

    // add table body
    myData.forEach(function(myDataRow, j) { 
    
        // add row
        $('#html_table_editor table > tbody').append('<tr></tr>');
    
        param_config.metadata.forEach(function(elt, i) {   
          
            contentEditable = param_config.editorType === 'simple' ? 'contenteditable' : '';  
            
            if(elt.isVisible){
                
                if(elt.isEditable){
                    $('#html_table_editor > table > tbody > tr:last')
                    .append('<td><span ' + contentEditable + ' title="Content editable"'
                    + ' data-name="'  + elt.colName + '"'
                    + ' data-type="' + elt.colType + '">'
                    + myDataRow[i] + '</span></td>');
                } else {
                    $('#html_table_editor > table > tbody > tr:last')
                    .append('<td><span class="content-non-editable" title="Content not editable"'  
                    + ' data-name="'  + elt.colName + '"'
                    + ' data-type="' + elt.colType + '">'  
                    + myDataRow[i] + '</span></td>');
                }
                
                
            }
        });
    
    });
    
    // add row icons
    $('#html_table_editor table > thead > tr > th:first').before('<th></th>'); // add extra cell to header
    
    var rowIcons = '';
    
    if(param_config.editorType === 'simple'){        
        rowIcons = removeIcon + saveIcon;
    } else {
        rowIcons = editIcon + removeIcon;
    }

    $('#html_table_editor table > tbody > tr').find('td:first').before('<td>' + rowIcons + '</td>');
    
    // datatables
    if(param_config.editorType === 'complex'){
        $('#myTableEditor').dataTable(); 
    } else {
        $('#myTableEditor').dataTable( {
            "paging": false,
            "bFilter": false
            //"ordering": false,
            //"info":     false
        } );
    }

    // for base table
    // [OPEN] has to be adjusted according to table mode
    bissolSaveRow();
    bissolRemoveRow();
    bissolNewRecord();
    
    $('#html_table_editor table > tbody > tr').on('click', function() {
        
        // remove existing hightlight
        $('#html_table_editor table > tbody > tr > td').removeClass( "row-highlight" );
        // highligh this row
        $(this).find("td").addClass( "row-highlight" );
        
    });
}
   
function bissolNewRecord(){    
    
    // Add new record button
    $('#html_new_record').prepend('<button type="button" class="btn btn-primary btn-lg btn-block btde-button" id="new-record-button">New Record</button>');

    // add event listeners
    $('#new-record-button').on('click', function() {
        // clear way
        $('#html_table_editor').empty();
        $('#new-record-button').remove();
        
        // create a dedicated panel
        var myNewRecordPanel =
            '<div class="panel panel-default" id="new-record-panel">'
            +'    <div class="panel-heading">New Record</div>'
            +'    <div class="panel-body">'
            +'    </div>'
            +'</div>';
    
        $('#html_new_record').append(myNewRecordPanel); 
        
        // create input elements
        var myFormInput = '<form id="btdeNewRecordForm" ' 
            // bootstrapValidator options
            + 'data-bv-feedbackicons-valid="glyphicon glyphicon-ok" '
            + 'data-bv-feedbackicons-invalid="glyphicon glyphicon-remove" '
            + 'data-bv-feedbackicons-validating="glyphicon glyphicon-refresh" '
            + '>';
        
        if(param_is_auto_increment == ''){
        
                // get max col id - quite a dummy action but does the purpose
                Dashboards.fireChange('param_id_column', param_id_column);
                
                myFormInput +=
                '<div class="form-group">'
                + '    <label for="' + param_id_column + '">' + param_id_column + '</label>'
                + '    <input class="form-control" '
                + ' id="' + param_id_column + '" '
                + ' placeholder="Enter ' + param_id_column + '" '
                + ' data-type="Integer"></input>' 
                + '</div>';          
        }
        
        var datetimeInputTypes = ['date','datetime','week','time'];
        var timeInputTypes = ['datetime','time'];
        
        param_config.metadata.forEach(function(elt, i) {
            if(elt.isEditable){
                
                var validation = '';
                
                if(elt.isRequired){
                    validation += ' data-bv-notempty="true"';
                    validation += ' data-bv-notempty-message="The ' + elt.colName + ' is required"';
                }
                
                var momentJsDateFormat = '';
                
                switch (elt.inputType) {
                    case 'date':
                        momentJsDateFormat = elt.colFormat.toUpperCase();
                        break;    
                    case 'datetime':
                        momentJsDateFormat = 'YYYY-MM-DD HH:mm:ss';
                        break;
                    // time not support by momentjs - using regex instead
                    // case 'time':
                    //     momentJsDateFormat = elt.colFormat;
                    //     break;
                }
                
                if(elt.validationPattern != ''){
                    validation += ' data-bv-regexp="true"';
                    validation += ' data-bv-regexp-regexp="' + elt.validationPattern + '"';
                    validation += ' data-bv-regexp-message="' + elt.validationTitle + '"';
                } 
                else if (elt.inputType === 'time' && elt.validationPattern === '') {
                    validation += ' data-bv-regexp="true"';
                    validation += ' data-bv-regexp-regexp="^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"';
                    validation += ' data-bv-regexp-message="Time must be specified in this format: ' + elt.colFormat + '"';                    
                }
                
                if(elt.inputType === 'date' || elt.inputType === 'datetime'){
                    validation += ' data-bv-date="true"';
                    validation += ' data-bv-date-format="' + momentJsDateFormat + '"';
                }
                
                if(datetimeInputTypes.indexOf(elt.inputType) > -1){
 
                    myFormInput +=
                    '<div class="form-group">'
                    + '    <label for="' + elt.colName + '">' + elt.colName + '</label>'
                    + '    <div class="input-group date">'
                    + '         <input type="text" class="form-control" '
                        + ' id="' + elt.colName + '" '
                        + ' data-type="' + elt.colType + '" '
                        //required for boostrapValidator:
                        + ' name="' + elt.colName + '" ' 
                        + validation
                        + ' />'
                    + '          <span class="input-group-addon">'
                    + '               <span class="glyphicon glyphicon-' + (timeInputTypes.indexOf(elt.inputType) > -1 ? 'time' : 'calendar') + '"></span>'
                    + '           </span>'
                    + '     </div>'
                    + '</div>'
                    ;
                } else {
                    var valType = elt.inputType == '' ? 'text' : elt.inputType;
                    
                    myFormInput +=
                    '<div class="form-group">'
                    + '    <label for="' + elt.colName + '">' + elt.colName + '</label>'
                    + '    <input class="form-control" '
                        + ' type="' + valType + '" '
                        + ' id="' + elt.colName + '" '
                        + ' placeholder="Enter ' + elt.colName + '" '
                        + ' data-type="' + elt.colType + '" '                       
                        //required for boostrapValidator:
                        + ' name="' + elt.colName + '" '
                        + validation
                        // HTML 5 standard validation attributes - currently not used as not supported by all browsers
                        // + (elt.isRequired ? ' required ' : '')
                        // + (elt.validationPattern !== '' ? ' pattern="' + elt.validationPattern + '" ' : '')
                        // + (elt.validationTitle !== '' ? ' title="' + elt.validationTitle + '" ' : '')
                        + '/>' 
                    +'</div>';    
                }
               
            } 
        });
        
        myFormInput += '</form>';
        
        $('#new-record-panel div.panel-body').append(myFormInput); 
        
        //initialize date pickers -- not an ideal solution right now
        param_config.metadata.forEach(function(elt, i) {
            if(elt.isEditable){
                if(elt.inputType === 'date'){
                    $('#' + elt.colName).datetimepicker({
                        pickTime: false
                        , format: 'YYYY-MM-DD'
                    });
                } 
                else if(elt.inputType === 'datetime'){
                    $('#' + elt.colName).datetimepicker({
                        format: 'YYYY-MM-DD HH:mm:00'
                    });
                } 
                else if(elt.inputType === 'time'){
                    $('#' + elt.colName).datetimepicker({
                        pickDate: false
                        , format: 'HH:mm:00'
                    });
                } 
                else if(elt.inputType === 'week'){
                    $('#' + elt.colName).datetimepicker({
                        format: 'YYYY-ww'
                    });
                } 
                else if(elt.inputType === 'month'){
                    $('#' + elt.colName).datetimepicker({
                        format: 'YYYY-MM'
                    });
                } 
            }         
        });
        
        if(param_is_auto_increment == ''){
        
            // get max col id - quite a dummy action but does the purpose
            Dashboards.fireChange('param_id_column', param_id_column);
        }
        
        // add Save Record button
        //$('#btdeNewRecordForm').append('<div id="new-record-save-button-div"><button type="submit" class="btn btn-primary btn-lg btn-block" id="new-record-save-button">Save Record</button></div>');

        $('#btdeNewRecordForm').append('<div class="form-group"><div><button type="submit" class="btn btn-primary btn-lg btn-block" id="new-record-save-button">Save Record</button></div></div>');

        // this bit was partly sourced from http://bootstrapvalidator.com/examples/ajax-submit/
        $(document).ready(function() {
                $('#btdeNewRecordForm')
                    .bootstrapValidator()
                    // specific check if all form validation checks were successfully passed
                    .on('success.form.bv', function(e) {
                        // Prevent form submission
                        e.preventDefault();
                        // Get the form instance
                        // var $form = $(e.target);
                        // Get the BootstrapValidator instance
                        // var bv = $form.data('bootstrapValidator');
                        // console.log(bv);
                        
                        var myNewRecordData = [];
                        
                        if(param_is_auto_increment == ''){
                            myNewRecordData.push($('#new-record-panel #' + param_id_column).val());          
                        }
                        
                        param_config.metadata.forEach(function(elt, i) {
                            if(elt.isEditable){
                                
                                myNewRecordData.push($('#new-record-panel #' + elt.colName).val());
                                console.log('The value for ' + elt.colName + ' is: ' + $('#new-record-panel #' + elt.colName).val() );
                                
                            }
                        
                        });  
                        
                        Dashboards.fireChange('param_new_record', myNewRecordData.join('|'));
                        // clear new record table and display standard table editor again
                        $('#new-record-panel').remove();
                        Dashboards.fireChange('param_sql_select', param_sql_select);

                    })
                    ;
        });

        // add Save Record button event
        // 
        // $('#btdeNewRecordForm').on('submit', function(e){
        //     
        //     e.preventDefault();
        // 
        //     var myNewRecordData = [];
        //     // var myNewRecordColTypes = [];
        //     // var myNewRecordColNames = [];
        //     
        //     if(param_is_auto_increment == ''){
        //         myNewRecordData.push($('#new-record-panel #' + param_id_column).val());
        //         // myNewRecordColTypes.push('Integer');
        //         // myNewRecordColNames.push(param_id_column);           
        //     }
        //     
        //     param_config.metadata.forEach(function(elt, i) {
        //         if(elt.isEditable){
        //             
        //             myNewRecordData.push($('#new-record-panel #' + elt.colName).val());
        //             console.log('The value for ' + elt.colName + ' is: ' + $('#new-record-panel #' + elt.colName).val() );
        //             // myNewRecordColTypes.push(elt.colType);
        //             // myNewRecordColNames.push(elt.colName);
        //             
        //         }
        //     
        //     });  
        //     
        //     //Dashboards.setParameter('param_db_connection', myJNDI); // should be already set
        //     
        //     // Dashboards.setParameter('param_col_types_delimited', myNewRecordColTypes.join('|'));
        //     // Dashboards.setParameter('param_col_names_delimited', myNewRecordColNames.join('|'));
        //     Dashboards.fireChange('param_new_record', myNewRecordData.join('|'));
        //     // clear new record table and display standard table editor again
        //     $('#new-record-panel').remove();
        //     Dashboards.fireChange('param_sql_select', param_sql_select);
        // 
        // 
        // });
        // 

    });
     
}

function bissolSaveRow() { 
    //.save-row
    $('#myUpdateButton').on('click', function() { 

        // 1) get data from html table
        var myValueArray = [];
        //var mySpanArray = $(this).parent().parent().find('span[contenteditable]');
        var mySpanArray = $('#html_table_editor table > tbody > tr > td.row-highlight').find('span[contenteditable]');

        $.each(mySpanArray, function(i, val){
            myValueArray.push($.text(this));
        });
        
        // 2) get data types from html table
        var myColTypesArray = [];
        
        $.each(mySpanArray, function(i, val){
            myColTypesArray.push($(this).attr('data-type'));
        });
        
        // 3) get col names from html table
        var myColNamesArray = [];
        
        $.each(mySpanArray, function(i, val){
            myColNamesArray.push($(this).attr('data-name'));
        });
        
        var myQuery = '';
                    
        //var myId = $(this).parent().parent().find('span[data-name="' + param_id_column + '"]').text();
        var myId = $('#html_table_editor table > tbody > tr > td.row-highlight').find('span[data-name="' + param_id_column + '"]').text();
        // prepare update string
        var myUpdateString = '';

        $.each(myValueArray, function(i, val){
            if(myColTypesArray[i].toUpperCase()==='STRING'){ 
                myUpdateString += myColNamesArray[i] + "='" + val + "'";
            } else {
                myUpdateString += myColNamesArray[i] + "=" + val;
            }
            if( i < (myValueArray.length - 1)) {
                myUpdateString += ",";
            }
        });

        myQuery = 'UPDATE ' + param_db_schematable + ' SET ' + myUpdateString + ' WHERE ' + param_id_column + ' = ' + myId;    

        console.log('This query will be executed: ' + myQuery);

        //Dashboards.setParameter('param_db_connection', myJNDI); // should be already set
        Dashboards.fireChange('param_sql_update', myQuery);
        
    }); 

}

function bissolRemoveRow() {
    $('#myDeleteButton').on('click', function() { 
        
        //var myId = $(this).parent().parent().find('span[data-name="' + param_id_column + '"]').text();
        //console.log($('#html_table_editor table > tbody > tr > td.row-highlight'));
        var myId = $('#html_table_editor table > tbody > tr > td.row-highlight').find('span[data-name="' + param_id_column + '"]').text();
        var myQuery = 'DELETE FROM ' + param_db_schematable + ' WHERE ' + param_id_column + ' = ' + myId;
        console.log('The query to submit is: ' + myQuery);

        //Dashboards.setParameter('param_db_connection', myJNDI); // not necessary, should be already set
        Dashboards.fireChange('param_sql_update', myQuery);
        
        $('#html_table_editor table > tbody > tr > td.row-highlight').parent().remove();

    });   
}