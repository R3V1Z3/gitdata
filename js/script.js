/* global $, jQuery, Tabletop */

// get spreadsheet from readme.md
var spreadsheet = 'https://docs.google.com/spreadsheets/d/10A7Pf6iXnjuRRK4TuUzw_pO7lUn6RjWDg-ENvfcQ2Bc/edit?usp=sharing';

var prefix = 'sys_';
var db = {};
// current item in db that is being displayed
var current = 0;

jQuery(document).ready(function() {
    
    main();
    
    function main() {
        // start by loading README.md
        $.ajax({
            url: "README.md",
            dataType: "text",
            success : function (readme) {
                render( readme, 'header' );
                // get spreadsheet url from readme
                render_variables( $('#header code') );
                get_content_template();
            }
        }).error(function(e) {
            console.log('Error on ajax return.');
        });
    }
    
    function get_content_template() {
        // get the content template
        $.ajax({
            url: "content.md",
            dataType: "text",
            success : function (template) {
                $('body').append('<div id="template"></div>');
                render( template, 'template' );
                // hide template, we'll only use it for templating purposes
                $('#template').hide();
                get_spreadsheet( spreadsheet );
            }
        }).error(function(e) {
            console.log('Error on ajax return.');
        });
    }
    
    function render( data, div_id ) {
        var md = window.markdownit();
        $( '#' + div_id ).html( md.render(data) );
    }
    
    function get_spreadsheet( publicSpreadsheetUrl ) {
        Tabletop.init( { key: publicSpreadsheetUrl,
                       callback: showInfo,
                       simpleSheet: true } );
    }

    function showInfo(data, tabletop) {
        db = data;
        render_content(db);
        register_events();
    }
    
    function render_content(db) {
        // create new content section
        $('#template').clone().attr( 'id','clone' ).appendTo('body');
        render_variables( $('#clone code') );
        // replace #YouTube with YouTube content
        var id = YouTubeGetID( $('#clone .YouTube').text() );
        $('#clone .YouTube').text('');
        $('#clone .YouTube').append( YouTubeEmbedContent(id) );
        
        // now remove clone and replace #content
        $('#content').empty();
        $('#clone').children().appendTo('#content');
        $('#clone').remove();
        register_events();
    }
    
    // simple helper function to get variable names
    function variable_name(str) {
        if ( str.charAt(0) === '$' ) {
            // ensure we return variable name without equal sign
            var n = str.substr(1).split('=')[0].trim();
            return n;
        }
        return '';
    }
    
    // helper function for nav items to avoid repitition
    function render_sys_nav( $this, t, n, r ) {
        var replace = t.replace( '$' + n, r );
        $this.replaceWith('<span class="nav" id="' + n + '">' + replace + '</span>');
        $this.parent().addClass( 'nav-section' );
    }
    
    function render_variables($code) {
        $code.each(function( i, val ){
            var t = $(this).text();
            // get variable name if it exists
            var n = variable_name(t);
            if (n != '' ) {
                // check for internal variables
                if ( n === prefix + 'current' ) {
                    render_sys_nav( $(this), t, n, current);
                } else if ( n === prefix + 'last' ) {
                    render_sys_nav( $(this), t, n, db.length - 1);
                } else if ( n === prefix + 'previous' ) {
                    render_sys_nav( $(this), t, n, '<');
                } else if ( n === prefix + 'next' ) {
                    render_sys_nav( $(this), t, n, '>');
                } else if ( n === prefix + 'url' ) {
                    // set spreadhsheet if assignment operator found
                    var s = $(this).text().split('=');
                    if ( s.length > 1) {
                        spreadsheet = s[1];
                    }
                    $(this).text('').contents().unwrap();
                }
                
                if ( db.length > 0 ) {
                    // now check if variable name exists in data set
                    if( typeof db[current][n] != "undefined" ) {
                        // handle table name when original is empty
                        if ( n === 'Original' && db[current][n] === '' ) {
                            $(this).text( t.replace( '$' + n, db[current]['Tables'] ) );
                        } else {
                            $(this).text( t.replace( '$' + n, db[current][n] ) );
                        }
                    }
                    // remove wrapped code tag and add name as css class
                    $(this).parent().addClass( n );
                    $(this).contents().unwrap();
                }
            }
        });
    }
    
    // helper for YouTube ID from here: https://gist.github.com/takien/4077195
    function YouTubeGetID(url){
        url = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/);
        return undefined !== url[2]?url[2].split(/[^0-9a-z_\-]/i)[0]:url[0];
    }
    
    function YouTubeEmbedContent(id) {
        var content = '<iframe width="560" height="315" src="https://www.youtube.com/embed/';
        content += id;
        content += '" frameborder="0" allowfullscreen></iframe>';
        return content;
    }
    
    function register_events() {
        $('.nav').click(function(e){
            var t = $(this).attr('id');
            switch(t) {
                case prefix + 'previous':
                    current--;
                    if(current < 0) current = db.length - 1;
                    render_content(db);
                    break;
                case prefix + 'current':
                    //code block
                    break;
                case prefix + 'next':
                    current++;
                    if(current > db.length - 1) current = 0;
                    render_content(db);
                    break;
                case prefix + 'last':
                    current = db.length;
                    render_content(db);
                    break;
                default:
                    //code block
            }
        });
    }
  
});