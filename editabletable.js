/*global $, window*/
$.fn.editableTableWidget = function (options) {
    'use strict';
    return $(this).each(function () {
        var editor,
            extender,
            extenderContainer,
            element = $(this),
            blockBlur = false,
            buildDefaultOptions = function () {
                var opts = $.extend({}, $.fn.editableTableWidget.defaultOptions);
                opts.editor = opts.editor.clone();
                return opts;
            },
            initExtendCells = function () {
                extender = $('<div class="editable-table__extend"></div>').appendTo(element.parent());
                extenderContainer = $('<div class="editable-table__extend-container"></div>').appendTo(element.parent());

                extender.on('mousedown', function () {
                    const extenderOffset = {
                        top: extender.offset().top + 4,
                        left: extender.offset().left + 4,
                    };

                    blockBlur = true;

                    extenderContainer
                        .width(0)
                        .height(0)
                        .show()
                        .offset(extenderOffset);

                    $(window).on('mousemove.editable-table.extend-cell', function (e) {
                        let height = (window.scrollY + e.clientY) - extenderOffset.top + 3,
                            width = (window.scrollX + e.clientX) - extenderOffset.left + 3;

                        if (height < 3) {
                            height -= 6;
                        }
                        if (width < 3) {
                            width -= 6;
                        }

                        extenderContainer
                            .offset({
                                top: height < 0 ? extenderOffset.top + height : extenderOffset.top,
                                left: width < 0 ? extenderOffset.left + width : extenderOffset.left,
                            })
                            .height(Math.abs(height))
                            .width(Math.abs(width));

                        const containerLeft = (width < 0 ? extenderOffset.left + width : extenderOffset.left) + 10,
                              containerTop = (height < 0 ? extenderOffset.top + height : extenderOffset.top) + 10,
                              containerRight = (width < 0 ? extenderOffset.left : extenderOffset.left + width) - 15,
                              containerBottom = (height < 0 ? extenderOffset.top : extenderOffset.top + height) - 10;

                        $.each(element.find('td'), function (index, element) {
                            element = $(element);
                            const elementOffset = element.offset(),
                                right = elementOffset.left + element.width(),
                                bottom = elementOffset.top + element.height();

                            if (containerBottom < elementOffset.top || containerTop > bottom ||
                                containerRight < elementOffset.left || containerLeft > right ||
                                element.hasClass('editable-table__prevent-edit')
                            ) {
                                element.removeClass('editable-table__extend__active-cell');
                                return;
                            }
                            element.addClass('editable-table__extend__active-cell');
                        });
                    });

                    $(window).on('mouseup.editable-table.extend-cell keydown.editable-table.extend-cell', function (e) {
                        if (e.type === 'keydown' && e.which !== ESC) {
                            return;
                        }

                        $(window)
                            .off('keydown.editable-table.extend-cell')
                            .off('mouseup.editable-table.extend-cell')
                            .off('mousemove.editable-table.extend-cell');

                        blockBlur = false;
                        extenderContainer.hide();

                        active.blur();

                        setActiveText();
                        hideEditor();

                        const elements = $('.editable-table__extend__active-cell');
                        elements.removeClass('editable-table__extend__active-cell');

                        if (e.type === 'keydown') {
                            return;
                        }

                        elements.text(active.text())
                            .trigger('change', active.text())
                            .trigger('validate', active.text());
                    });
                });

                extender.on('mouseleave', () => blockBlur = false);
            },
            getOptions = function (options) {
                const opts = $.extend(buildDefaultOptions(), options);
                editor = opts.editor.css('position', 'absolute').hide().appendTo(element.parent());

                // identify columns which shall not be edited via class
                $.each(
                    opts.preventColumns,
                    (index, column) => element
                        .find(`td:nth-of-type(${column})`)
                        .addClass('editable-table__prevent-edit')
                );

                if (opts.extendCells) {
                    initExtendCells();
                }

                return opts;
            },
            activeOptions = getOptions(options),
            ARROW_LEFT = 37, ARROW_UP = 38, ARROW_RIGHT = 39, ARROW_DOWN = 40, ENTER = 13, ESC = 27, TAB = 9,
            active,
            showEditor = function (select) {
                active = element.find('td:focus');

                // Prevent edit of the columns specified
                if ($.inArray(active.index() + 1, activeOptions.preventColumns) !== -1) {
                    active.blur();
                    return;
                }

                if (active.length) {
                    editor.val(active.text())
                        .removeClass('error')
                        .show()
                        .offset(active.offset())
                        .css(active.css(activeOptions.cloneProperties))
                        .width(active.width())
                        .height(active.height())
                        .focus();

                    if (activeOptions.extendCells) {
                        const offset = active.offset();

                        offset.top += active.height();
                        offset.left += active.width();

                        extender.show().offset(offset);
                    }
                    if (select) {
                        editor.select();
                    }
                }
            },
            hideEditor = function () {
                editor.hide();

                if (activeOptions.extendCells) {
                    extender.hide();
                }
            },
            setActiveText = function () {
                var text = editor.val(),
                    evt = $.Event('change');
                if (active.text() === text || editor.hasClass('error')) {
                    return true;
                }
                active.text(text).trigger(evt, text);
            },
            movement = function (element, keycode) {
                if (keycode === ARROW_RIGHT) {
                    return element.next('td');
                } else if (keycode === ARROW_LEFT) {
                    return element.prev('td');
                } else if (keycode === ARROW_UP) {
                    return element.parent().prev().children().eq(element.index());
                } else if (keycode === ARROW_DOWN) {
                    return element.parent().next().children().eq(element.index());
                }
                return [];
            };
        editor.blur(function () {
            if (blockBlur) {
                return;
            }

            setActiveText();
            hideEditor();
        }).keydown(function (e) {
            if (e.which === ENTER) {
                setActiveText();
                hideEditor();
                active.focus();
                e.preventDefault();
                e.stopPropagation();
            } else if (e.which === ESC) {
                editor.val(active.text());
                e.preventDefault();
                e.stopPropagation();
                hideEditor();
                active.focus();
            } else if (e.which === TAB) {
                active.focus();
            } else if (this.selectionEnd - this.selectionStart === this.value.length) {
                var possibleMove = movement(active, e.which);
                if (possibleMove.length > 0) {
                    possibleMove.focus();
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        })
            .on('input paste', function () {
                var evt = $.Event('validate');
                active.trigger(evt, editor.val());
                if (evt.result === false) {
                    editor.addClass('error');
                } else {
                    editor.removeClass('error');
                }
            });
        element.on('click keypress dblclick', showEditor)
            .css('cursor', 'pointer')
            .keydown(function (e) {
                var prevent = true,
                    possibleMove = movement($(e.target), e.which);
                if (possibleMove.length > 0) {
                    possibleMove.focus();
                } else if (e.which === ENTER) {
                    showEditor(false);
                } else if (e.which === 17 || e.which === 91 || e.which === 93) {
                    showEditor(true);
                    prevent = false;
                } else {
                    prevent = false;
                }
                if (prevent) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            });

        element.find('td').prop('tabindex', 1);

        $(window).on('resize', function () {
            if (editor.is(':visible')) {
                editor.offset(active.offset())
                    .width(active.width())
                    .height(active.height());

                if (options.extendCells) {
                    const offset = active.offset();

                    offset.top += active.height();
                    offset.left += active.width();

                    extender.offset(offset);
                }
            }
        });
    });

};
$.fn.editableTableWidget.defaultOptions = {
    cloneProperties: [
        'padding',
        'padding-top',
        'padding-bottom',
        'padding-left',
        'padding-right',
        'text-align',
        'font',
        'font-size',
        'font-family',
        'font-weight',
        'border',
        'border-top',
        'border-bottom',
        'border-left',
        'border-right'
    ],
    editor: $('<input>'),
    preventColumns: [],
    extendCells: false,
};

