
// icons
// var deleteIcon = '<span class="glyphicon glyphicon-minus-sign delete-row" data-toggle="modal" data-target="#myDeleteModal"></span>';
var deleteIcon = '<span class="glyphicon glyphicon-minus-sign delete-row"></span>';
var addIcon = '<span class="glyphicon glyphicon-plus-sign add-row" id="insert-row-button"></span>';
// var updateIcon = '<span class="glyphicon glyphicon-floppy-disk update-row" data-toggle="modal" data-target="#myUpdateModal"></span>';
var updateIcon = '<span class="glyphicon glyphicon-floppy-disk update-row"></span>';
var editIcon = '<span class="glyphicon glyphicon-pencil edit-row"></span>';

// font-awesome icons: added fa-fw for fixed width
// var addIcon = '<i class="fa fa-plus-square fa-fw"></i>'; // two options: fa-plus-square or fa-plus
// var edit-row = '<i class="fa fa-pencil fa-fw"></i>';
// var updateIcon = '<i class="fa fa-save fa-fw"></i>';
// var deleteIcon= '<i class="fa fa-times fa-fw"></i>'; // two options: fa-times or fa-trash


function bissolFetchConfigServerSide(conf){
    
    var config = JSON.parse(conf);
    
    // for backwards compatibility add new attributes which might not be in old configs and are required now
    if(typeof config.editorType === 'undefined') config.editorType = 'simple';

    Dashboards.setParameter('param_config', config);
    
    var myIdColumn = '';
    var myColIsAutoIncrement = '';
    var myColNamesVisible = [];
    var myColNamesVisible4SqlSelect = [];
    
    config.metadata.forEach(function(elt, i) {
        if(elt.isPrimaryKey) myIdColumn = elt.colName;
        if(elt.isVisible) myColNamesVisible.push(elt.colName);
        if(elt.isAutoIncrement) myColIsAutoIncrement = elt.colName;
        // if(elt.isVisible){
        //     if(elt.colType === 'Date'){
        //         myColNamesVisible4SqlSelect.push('TO_CHAR(' + elt.colName + ', ' + elt.colFormat + ')');
        //         // MySQL
        //         //myColNamesVisible4SqlSelect = 'DATE_FORMAT(' + elt.colName + ', ' + elt.colFormat + ')';
        //         // [OPEN] Maybe alternatively you can apply formatting directly on the CDA result set. Would be easier
        //         // than having to consider all the various DB date format functions
        //     } else {
        //         myColNamesVisible4SqlSelect.push(elt.ColName) ;
        //     }
        // }
    });
    
    var mySchemaAndTable = '';
    if(config.dbSchema !== ''){
        mySchemaAndTable = config.dbSchema + '.' + config.dbTable;
    } else {
        mySchemaAndTable = config.dbTable;
    }

    
    var myMaxIdQuery = "SELECT MAX(" + myIdColumn + ") AS max_id FROM " + mySchemaAndTable;
    // NOTE: The max id is set in the web input form via the 
    // post execution function of the comp_fetch_max_id component
    
    // for select query convert date values into string
    
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

function bissolGetRowValues(myRowDataCells, method){
    // reads out the data values, types etc from the spans of an html tabe row
    // must include editable and non editable cells
    // method: insert, update

    var btdeRow = {};

    //var myEditableCells = $(myRowDataCells).find('[data-editable="true"]');
    
    var myEditableCells = '';
    
    // console.log('-------');
    // console.log('The editor type is: ' + param_config.editorType);
    // console.log('The data method is: ' + method);
    
    if(param_config.editorType === 'simple' && method === 'insert' && param_is_auto_increment === ''){
        // we get all values now as the new id is already present in the UI
        myEditableCells = myRowDataCells.filter('[data-name]');
    } else {
        myEditableCells = myRowDataCells.filter('[data-editable="true"]'); 
    }
    
    // console.log(myEditableCells);
    
    var myValueArray = [];
    var myColTypesArray = [];
    var myColNamesArray = [];
    
    $.each(myEditableCells, function(i, val){
        myValueArray.push($.text(this));
        myColTypesArray.push($(this).attr('data-type'));
        myColNamesArray.push($(this).attr('data-name'));
    });

    
    //var myId = $(myRowDataCells).find('span[data-name="' + param_id_column + '"]').text();
    var myId = $(myRowDataCells).filter('span[data-name="' + param_id_column + '"]').text();
    
    console.log('The values of the selected cells are: ' + myValueArray);
    console.log('The types of the selected cells are: ' + myColTypesArray);
    console.log('The names of the selected cells are: ' + myColNamesArray);
    console.log('The id of the selected row is: ' + myId);
    
    return {
        myColValues: myValueArray
        , myColTypes: myColTypesArray
        , myColNames: myColNamesArray
        , myId: myId
    }

}

// -- basic row structure for reuse --
// creates row for the table editor for any type and can as well 
// create rows with no values in it for new record entry 
function btdeCreateRow(options){
    // cellValues: value from DB table cell
    // cellValues is optional so that we can as well create blank rows for new entries for the simple editor mode
    // rowType: currently only 'empty' for completely new record entry for the simple editor
    
    var cellValues = options.cellValues; 
    var rowType = options.rowType;
    
    var cellValuesLocal = typeof cellValues === 'undefined' ? [] : cellValues;

    var myRow = '';
    
    // add cell for action icons 
    var rowIcons = '';
    
    if(typeof rowType !== 'undefined'){
        rowIcons = addIcon;    
    }
    else if(param_config.editorType === 'simple'){        
        rowIcons = deleteIcon + updateIcon;
    } else {
        rowIcons = editIcon + deleteIcon;
    }

    var contentEditable = '';
    contentEditable = param_config.editorType === 'simple' ? 'contenteditable' : '';
    
    myRow = '<tr><td>' + rowIcons + '</td>';
    
    // raw data is in different order then the metadata
    // provide additional index
    var z = 0;
    
    // actual cells for data        
    param_config.metadata.forEach(function(elt, i) {               
    
        if(elt.isVisible){
            
            // PDI returns empty fields with null, so we have to get rid of this here as well
            var cellValue = typeof cellValuesLocal[z] === 'undefined' || cellValuesLocal[z] == null ? '' : cellValuesLocal[z];
            
            if(elt.isEditable){
                myRow +=
                    '<td><span ' + contentEditable + ' title="Content editable"'
                    + ' data-editable="'  + elt.isEditable + '"'
                    + ' data-name="'  + elt.colName + '"'
                    + ' data-type="' + elt.colType + '">'
                    + cellValue
                    + '</span></td>'
                ;
            } else {
                myRow +=
                    '<td><span class="content-non-editable" title="Content not editable"'  
                    + ' data-editable="'  + elt.isEditable + '"'
                    + ' data-name="'  + elt.colName + '"'
                    + ' data-type="' + elt.colType + '">'  
                    + cellValue 
                    + '</span></td>'
                ;
            }  
            
            z++;
        }
        
    });
    
    myRow += '</tr>';
    
    $('#html_table_editor table > tbody').append(myRow);
    
    if(rowType === 'empty'){
        // add max id
        if(param_is_auto_increment === ''){
            Dashboards.fireChange('param_id_column', param_id_column);
            // all additional actions defined in CDE > Components > comp_fetch_max_id > Post Execution
        } else {
            $('#html_table_editor table > tbody > tr:last')
                .find('[data-name="' + param_id_column + '"]')
                .text('n/a');
            // all additional actions defined in CDE > Components > comp_save_new_record > Post Execution
        }
    }
}

function bissolBuildTable(data) {
    // no reason to define param_config_id as a function arguement as it is already set as a parameter value
    
    // simple table mode:
    // - no pagination
    // - no search
    // - inline editing
    // - inline new rew/record
    // - no validation
    // - no input helpers (date picker etc)

    var myData = data;
    
    // empty in case table already exists
    $('#html_table_editor').empty();
    $('#html_new_record').empty(); 
        
    // ------------------------------------
   
    // PREPARE BASIC TABLE STRUCTURE
    
    $('#html_table_editor').append('<table id="myTableEditor" class="display"><thead><tr></tr></thead><tbody></tbody></table>');

    // ------------------------------------
    
    // TABLE HEADER
    
    // add table header cells
       
    param_config.metadata.forEach(function(elt, i) {
        if(elt.isVisible){
            $('#html_table_editor table > thead > tr').append('<th>' + elt.colName + '</th>');
        }    
    });
    
    // add extra cell to header for row icons
    $('#html_table_editor table > thead > tr > th:first').before('<th></th>');
    
    // ------------------------------------
    
    // TABLE BODY
    
    // if($.isEmptyObject(data) && param_config.editorType === 'simple'){
    //     var options = {};
    //     options.rowType = 'empty';
    //     btdeCreateRow(options);    
    // }

    // add table body (with data)
    myData.forEach(function(val, j) {
        var options = {};
        options.cellValues = val;
        btdeCreateRow(options);
    });
    
    // ------------------------------------
    
    // FORMATTING
    
    // datatables
    if(param_config.editorType === 'complex'){
        $('#myTableEditor').dataTable(); 
    } else {
        // no dataTable styling at all - keep it a simple bootstrap styled table
        
        $('#myTableEditor').prop('class','table table-striped');
        
        // $('#myTableEditor').dataTable( {
        //     "paging": false,
        //     "bFilter": false
        //     //"ordering": false,
        //     //"info":     false
        // } );
        $('#myTableEditor')
        
    }
    
    // ------------------------------------
    
    // ACTIONS

    // for base table
    if(param_config.editorType === 'complex'){
        // ADD NEW RECORD BUTTON
        $('#html_new_record').prepend('<button type="button" class="btn btn-primary btn-lg btn-block btde-button" id="new-record-button">New Record</button>');
        
        $('#new-record-button').on('click', function(){
           bissolCreateRecordScreen('New');  
        });
        
    } else {
        // add blank input row for simple editor
        var options = {};
        options.rowType = 'empty';
        btdeCreateRow(options);
    }


    // use event delegation to make sure existing and future new rows get all the events

    $('#html_table_editor table')
        .on(
            {
                click: function (e) {

                    if(e.target.className.indexOf('edit-row') > 0){
                        
                        // stop the event from bubbling up
                        e.stopPropagation();
                        
                        // get data
                        var existingData = bissolGetRowValues(
                            $(e.target).parent().siblings().find('span')
                        );
                        
                        bissolCreateRecordScreen('Edit', existingData);    
                    
                    } 
                    
                    else if(e.target.className.indexOf('delete-row') > 0){
                        
                        // stop the event from bubbling up
                        e.stopPropagation();

                        // get data
                        var existingData = bissolGetRowValues(
                            $(e.target).parent().siblings().find('span')
                        );

                        
                        $('#myDeleteModal').remove(); // removing any pre-existing models 
                        bissolCreateModal(
                            'body'
                            , 'myDeleteModal'
                            , 'Deletion'
                            , 'Do you really want to delete this record with id <span id="delete-modal-record-id">' + existingData.myId + '</span>?'
                            , 'myDeleteButton'
                            , 'Delete'
                        );
                        
                        $('#myDeleteModal').modal('show');    
                    
                    } 
                    
                    else if(e.target.className.indexOf('update-row') > 0) {
                        
                        // APPLIES TO SIMPLE EDITOR ONLY
                        
                        // stop the event from bubbling up
                        e.stopPropagation();
                        
                        // get data

                        $('#myUpdateModal').remove();  // removing any pre-existing models 
                        bissolCreateModal(
                            'body'
                            , 'myUpdateModal'
                            , 'Update'
                            , 'Do you really want to update this record?'
                            , 'myUpdateButton'
                            , 'Update'
                        );
                        
                        $('#myUpdateModal').modal('show'); 
                        
                        
                    }
                    
                    else {

                        // function highlightRow() {
                        console.log(e);
                        // remove existing hightlight
                        $('#html_table_editor table > tbody > tr > td').removeClass( "row-highlight" );
                        // highligh this row
                        $(e.target).parent('tr').find("td").addClass( "row-highlight" );
                    }
                    

                }
            }
            , 'tbody > tr' 
        )
    ;

    
    // attached modal actions on a higher level
    $('body')
        // deregister any prev events
        .off('click', '#myDeleteButton')
        .on(
            {
                click: function btdeRemoveRow(e) {
                    //var myId = $(this).parent().parent().find('span[data-name="' + param_id_column + '"]').text();
                    //console.log($('#html_table_editor table > tbody > tr > td.row-highlight'));
                    //var myId = $('#html_table_editor table > tbody > tr > td.row-highlight').find('span[data-name="' + param_id_column + '"]').text();
                    
                    
                    
                    var myId = $('#delete-modal-record-id').text();
                    // actually I could have just stored this in a normal variable instead of reading it from the modal
                    
                    // console.log('------');
                    // console.log('Deleting record with following id: ' + myId);
                    var myQuery = 'DELETE FROM ' + param_db_schematable + ' WHERE ' + param_id_column + ' = ' + myId;
                    console.log('The query to submit is: ' + myQuery);
                    
                    //Dashboards.setParameter('param_db_connection', myJNDI); // not necessary, should be already set
                    Dashboards.fireChange('param_sql_update', myQuery);
                    
                    // $('#html_table_editor table > tbody > tr > td.row-highlight').parent().remove(); 
                    
                    // refresh table
                    Dashboards.fireChange('param_sql_select', param_sql_select);
                }
            }
            , '#myDeleteButton'    
        );  
    
    // currently used for simple editor only:
    if(param_config.editorType === 'simple'){
        $('#html_table_editor table')
            // deregister any prev events
            .off('click', '#insert-row-button')
            .on(
                {
                    click: function btdeInsertRow(e) { 
                    
                        // get data from html table
                        //var mySpanArray = $(this).parent().parent().find('span[contenteditable]');
                        var mySpanArray = '';
                        //var mySpanArray = $('#html_table_editor table > tbody > tr > td.row-highlight').find('span[contenteditable]');
                        var mySpanArray = $('#html_table_editor table > tbody > tr > td.row-highlight').find('span');
                        var myRow = bissolGetRowValues(mySpanArray, 'insert');
                        
                        Dashboards.fireChange('param_new_record', myRow.myColValues.join('|'));
                        
                        // replace icons
                        $('#html_table_editor table > tbody > tr:last > td:first')
                            .empty()
                            .append(deleteIcon)
                            .append(updateIcon)
                            ;
                        
                        // add new empty row
                        var options = {};
                        options.rowType = 'empty';
                        btdeCreateRow(options);
                    }
                }
                , '#insert-row-button'
            )
            ;
        
            // attach event to a higher level for modal
            $('body')
                // deregister any prev events
                .off('click', '#myUpdateButton')
                .on(
                    {
                        click: function btdeUpdateRow(e){
                            // get data from html table
                            //var mySpanArray = $(this).parent().parent().find('span[contenteditable]');
                            //var mySpanArray = $('#html_table_editor table > tbody > tr > td.row-highlight').find('span[contenteditable]');
                            var mySpanArray = $('#html_table_editor table > tbody > tr > td.row-highlight').find('span');
                            var myRow = bissolGetRowValues(mySpanArray, 'update');
                            // console.log(myRow);
                            bissolCreateUpdateQuery(myRow);
                        }
                    }
                    , '#myUpdateButton'    
                )
            ;   
    } 

}    
   
function bissolCreateRecordScreen(editType, existingData){
//editType: Edit, New            
 
    if(editType !== 'Edit'){
        var existingData = {};
    } 

    // console.log('--------');
    // console.log(existingData);
    
    // clear way
    $('#html_table_editor').empty();
    $('#new-record-button').remove();
    
    // create a dedicated panel
    var myNewRecordPanel =
        '<div class="panel panel-default" id="new-record-panel">'
        +'    <div class="panel-heading">' + editType + ' Record</div>'
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
    
    var datetimeInputTypes = ['date','datetime','week','time'];
    var timeInputTypes = ['datetime','time'];
    
    var dateTimeCols = [];

    //console.log(existingData.myColValues);
    
    var editableCounter = 0;
    
    param_config.metadata.forEach(function(elt, i) {
        
        if(elt.isPrimaryKey && !elt.isEditable && editType == 'Edit') {
            
            var myRecordId = '';
            var myRecordIdEditDisabled = '';
            
            myRecordId = ' value="' + existingData.myId  + '" ';
            myRecordIdEditDisabled = 'disabled';
            
            myFormInput +=
            '<div class="form-group">'
            + '    <label for="' + param_id_column + '">' + param_id_column + '</label>'
            + '    <input class="form-control" '
            + ' id="' + param_id_column + '" '
            + ' placeholder="Enter ' + param_id_column + '" '
            + ' data-type="Integer" '
            + myRecordId
            + myRecordIdEditDisabled
            + '></input>' 
            + '</div>';  
            
        } else if(elt.isEditable) {
            
            if(elt.isPrimaryKey){
                
                if(editType === 'New'){
                    // get max col id - quite a dummy action but does the purpose
                    Dashboards.setParameter('param_record_edit_type', editType);
                    Dashboards.fireChange('param_id_column', param_id_column);
                }
                
                var myRecordId = '';
                var myRecordIdEditDisabled = '';
                
                //if(!$.isEmptyObject(existingData)) {
                if(editType === 'Edit'){
                    myRecordId = ' value="' + existingData.myId  + '" ';
                    myRecordIdEditDisabled = 'disabled';
                }
                
                myFormInput +=
                '<div class="form-group">'
                + '    <label for="' + param_id_column + '">' + param_id_column + '</label>'
                + '    <input class="form-control" '
                + ' id="' + param_id_column + '" '
                + ' placeholder="Enter ' + param_id_column + '" '
                + ' data-type="Integer" '
                + myRecordId
                + myRecordIdEditDisabled
                + '></input>' 
                + '</div>';  
                
                
            } else {
            
                var validation = '';
                
                if(elt.isRequired){
                    validation += ' data-bv-notempty="true"';
                    validation += ' data-bv-notempty-message="The ' + elt.colName + ' is required"';
                }
                
                var momentJsDateFormat = '';
                
                
                switch (elt.inputType) {
                    case 'date':
                        momentJsDateFormat = elt.colFormat.toUpperCase();
                        dateTimeCols.push(elt.colName);
                        break;    
                    case 'datetime':
                        momentJsDateFormat = 'YYYY-MM-DD HH:mm:ss';
                        dateTimeCols.push(elt.colName);
                        break;
                    // time not support by momentjs - using regex instead
                    // case 'time':
                    //     momentJsDateFormat = elt.colFormat;
                    //     break;
                }
                
                if(elt.validationPattern != ''){
                    validation += ' data-bv-regexp="true"';
                    validation += ' data-bv-regexp-regexp="' + elt.validationPattern + '"';
                    validation += ' data-bv-regexp-message="' + elt.validationMessage + '"';
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
                
                var existingValueHTML = '';
                
                if(editType === 'New'){
                    existingValueHTML += ' value="' + elt.defaultValue +'" ';
                }
                else if(editType === 'Edit' && typeof existingData.myColValues !== 'undefined') {
                    existingValueHTML = ' value="' + existingData.myColValues[editableCounter] +'" ';    
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
                        + existingValueHTML
                        + ' />' 
                    + '          <span class="input-group-addon">'
                    + '               <span class="glyphicon glyphicon-' + (timeInputTypes.indexOf(elt.inputType) > -1 ? 'time' : 'calendar') + '"></span>'
                    + '           </span>'
                    + '     </div>'
                    + '</div>'
                    ;
                }
                 
                else if( elt.inputType === 'select' ){
                                        
                    var details = 
                        { queryDefinition:  
                            {
                                // query id
                                dataAccessId: elt.cdaId,
                                // path to cda file
                                path: elt.cdaPath
                            }
                            // , parameters: { "fruit" : "apple" }
                        }
                    ;
                    
                    try {
                            QueryComponent.makeQuery(details);
                    } catch(e) {
                            Dashboards.error("Error fetching details:" + e);
                    }
                    
                    
                    if (details.result && details.result.length > 0) {

                        myFormInput +=
                        '<div class="form-group">'
                        + '    <label for="' + elt.colName + '">' + elt.colName + '</label>'
    
                        + '     <div id="' + elt.colName + '" data-type="' + elt.colType + '">'
                        
                        + bissolCreateSelect(
                            {
                                myData: details.result
                                , myDefaultValue: typeof existingData.myColValues === 'undefined' ? '' : existingData.myColValues[editableCounter]
                            }
                        )
                        
                        + '     </div>'
                        + '</div>';    
                    
                    }
                    
                }
                
                else {
                    
                    var valType = elt.inputType === '' ? 'text' : elt.inputType;
                    
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
                        // + (elt.validationMessage !== '' ? ' title="' + elt.validationMessage + '" ' : '')
                        + existingValueHTML
                        + ' />' 
                    +'</div>';    
                }
            
            }
            
            editableCounter++;
           
        } 
    });
    
    myFormInput += '</form>';
    
    $('#new-record-panel div.panel-body').append(myFormInput); 
    
    // revalidate datetime form elements
    // required because we use datetime input widget
    // http://bootstrapvalidator.com/validators/date/#datetime-picker-example
    // http://bootstrapvalidator.com/examples/#compatibility
    dateTimeCols.forEach(function(elt, i) {
        $('#btdeNewRecordForm')
            .bootstrapValidator()
            // Revalitate fields
            .on('change','[name="' + elt + '"]', function(e){
                console.log('Adding bootstrapValidator Revalidation for field: ' + elt);
                $('#btdeNewRecordForm').bootstrapValidator('revalidateField', elt);
            })
            ;
    })
    
    
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
    
    var buttonText = editType === 'New' ? 'Save Record' : 'Update Record';
    
    $('#btdeNewRecordForm').append('<div class="form-group"><div><button type="submit" class="btn btn-primary btn-lg btn-block" id="new-record-save-button">' + buttonText + '</button></div></div>');
    
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
                    
                    var myColValues = [];
                    var myColTypes = [];
                    var myColNames = [];
                    
                    myId = $('#new-record-panel #' + param_id_column).val();
                    
                    // if(param_is_auto_increment === '' && editType === 'New'){
                    //     myColValues.push(myId);       
                    // }
                    
                    param_config.metadata.forEach(function(elt, i) {
                        if(elt.isEditable){
                            
                            var colValue = '';
                            
                            if(elt.inputType === 'select'){
                                colValue = $('#new-record-panel #' + elt.colName + ' option:selected').val();                               
                            } else {
                                colValue = $('#new-record-panel #' + elt.colName).val();
                            }
                            
                            var colName = elt.colName;
                            var colType = colType = $('#new-record-panel #' + elt.colName).attr('data-type');
                            myColValues.push(colValue);
                            myColNames.push(colName);
                            myColTypes.push(colType);
                            
                            console.log('The value for ' + elt.colName + ' is: ' 
                            + colValue
                            + ', Type: '
                            + colType
                            );
                            
                        }
                    
                    });  
                    
                    
                    if(editType === 'New'){
                        Dashboards.fireChange('param_new_record', myColValues.join('|'));  
                    } else { //Update                      
                        bissolCreateUpdateQuery(//myRecord -- expects literal object
                            {
                                myColValues: myColValues
                                , myColTypes: myColTypes
                                , myColNames: myColNames
                                , myId: myId
                            }
                            );
                    }
                    
                    // clear new record table and display standard table editor again
                    $('#new-record-panel').remove();
                    Dashboards.fireChange('param_sql_select', param_sql_select);
    
                })
                ;
    });

}

function bissolCreateUpdateQuery(myRow){
    
    var myQuery = '';
    var myUpdateString = '';
    
    $.each(myRow.myColValues, function(i, val){
        console.log(myRow.myColTypes[i]);
        
        if(myRow.myColTypes[i].toUpperCase()==='STRING' || myRow.myColTypes[i].toUpperCase()==='DATE'){ 
            myUpdateString += myRow.myColNames[i] + "='" + val + "'";
        } else {
            myUpdateString += myRow.myColNames[i] + "=" + val;
        }
        if( i < (myRow.myColValues.length - 1)) {
            myUpdateString += ",";
        }
    });
    
    myQuery = 'UPDATE ' + param_db_schematable + ' SET ' + myUpdateString + ' WHERE ' + param_id_column + ' = ' + myRow.myId;    
    
    console.log('This query will be executed: ' + myQuery);
    
    Dashboards.fireChange('param_sql_update', myQuery);

}