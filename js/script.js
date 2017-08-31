/* global $, jQuery, Tabletop */

// get URL parameters
let params = (new URL(location)).searchParams;
var path = '/' + window.location.hostname.split('.')[0];
path += window.location.pathname;

// get spreadsheet from readme.md
var spreadsheet = 'https://docs.google.com/spreadsheets/d/10A7Pf6iXnjuRRK4TuUzw_pO7lUn6RjWDg-ENvfcQ2Bc/edit?usp=sharing';

var sys_prefix = 'sys_';
var sys_var = {
    'previous': sys_prefix + 'previous',
    'current': sys_prefix + 'current',
    'next': sys_prefix + 'next',
    'last': sys_prefix + 'last',
    'url': sys_prefix + 'url'
};
var db = {};
// current item in db that is being displayed
var current = 0;

jQuery(document).ready(function() {
    
    main();
    
    function main() {
        // start by loading README.md
        $.ajax({
            url: "template.md",
            dataType: "text",
            success : function (template) {
                render_github_ribbon();
                render_markdown(template);
                separate_header();
                render_variables( $('#header code') );
                render_template();
                get_spreadsheet( spreadsheet );
            }
        }).error(function(e) {
            console.log('Error on ajax return.');
        });
    }
    
    function render_github_ribbon() {
        var content = '<a class="github-fork-ribbon" href="//github.com' + path;
        content += '" title="Fork me on GitHub">Fork me on GitHub</a>';
        $('body').append(content);
    }
    
    function render_markdown( data ) {
        var md = window.markdownit();
        $( '#content' ).html( md.render(data) );
    }
    
    function render_template() {
        // add template div, move content div to it and hide it
        $('body').append('<div id="template"></div>');
        $('#content').children().clone().appendTo('#template');
        $('#template').hide();
    }
    
    function separate_header() {
        var header = 'h1';
        var heading = 'h2';
        if ( $('#wrapper ' + header).length ) {
            $('#wrapper ' + header).each(function() {
                var name = css_name( $(this).text() );
                $(this).wrapInner('<a class="handle" name="' + name + '" href="#' + name + '"/>');
                $(this).nextUntil(heading).andSelf().wrapAll('<div class="section header" id="' + name + '"/>');
            });
        } else {
            //no header, so we'll add an empty one
            $('#wrapper').append('<div class="header"></div>');
        }
        $('#header').clone().prepend('#wrapper').remove();
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
                if ( n === sys_var['current'] ) {
                    render_sys_nav( $(this), t, n, current);
                } else if ( n === sys_var['last'] ) {
                    render_sys_nav( $(this), t, n, db.length - 1);
                } else if ( n === sys_var['previous'] ) {
                    render_sys_nav( $(this), t, n, '<');
                } else if ( n === sys_var['next'] ) {
                    render_sys_nav( $(this), t, n, '>');
                } else if ( n === sys_var['url'] ) {
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
                    $(this).parent().addClass( 'sys_field ' + n );
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
    
    // helper function to ensure section ids are css compatible
    function css_name(str) {
        str = str.toLowerCase();
        // remove non-alphanumerics
        str = str.replace(/[^a-z0-9_\s-]/g, '-');
        // clean up multiple dashes or whitespaces
        str = str.replace(/[\s-]+/g, ' ');
        // remove leading and trailing spaces
        str = str.trim();
        // convert whitespaces and underscore to dash
        str = str.replace(/[\s_]/g, '-');
        return str;
    }
    
    function register_events() {
        $('.nav').click(function(e){
            var t = $(this).attr('id');
            switch(t) {
                case sys_var['previous']:
                    current--;
                    if(current < 0) current = db.length - 1;
                    render_content(db);
                    break;
                case sys_var['current']:
                    //code block
                    break;
                case sys_var['next']:
                    current++;
                    if(current > db.length - 1) current = 0;
                    render_content(db);
                    break;
                case sys_var['last']:
                    current = db.length - 1;
                    render_content(db);
                    break;
                default:
                    //code block
            }
        });
    }
  
});