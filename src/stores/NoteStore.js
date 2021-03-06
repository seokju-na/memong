var AppDispatcher = require('../dispatcher/AppDispatcher');
var EventEmitter = require('events').EventEmitter;

var Constants = require('../constants/Constants');

var _ = require('underscore');
var uuid = require('node-uuid');

var WebGetUtils = require('../utils/WebGetUtils');
var cookie = require('react-cookie');



//Note Data
var selectNote = {};

//Memo Data
var memos = [];
var globalEditMemo = {
    key: uuid.v4(),
    title: null,
    text: "",
    mtype: Constants.MemoType.GLOBAL_EDIT_MEMO,
    date: null
};



//Private Function
//비공개 함수 영역입니다. 데이터를 수정합니다.

//서버로부터 불러온 초기 메모 데이터 설정
function initMemo(_memos) {
    memos = [];
    _.each(_memos, function(memo) {
        memo.key = uuid.v4();
    });
    memos = memos.concat(_memos);
    memos.push(_.extend({}, globalEditMemo));
}

function initNote(_selectNote) {
    selectNote = _selectNote;
}

function addMemo(_targetEditMemo, _context) {
    var index = _indexOf(memos, _targetEditMemo.key, "key");

    var newMemo = _.extend({}, {
        text: _context
    });
    var _newMemos = _parseMemo(newMemo);

    if (_newMemos != null) {
        var len = _newMemos.length;
        for (var idx=0; idx<len; idx++) {
            memos.splice(index+idx, 0, _newMemos[idx]);
        }
    }
}

function addMemoInEditMemo(_targetEditMemo, _allContext) {
    var index = _indexOf(memos, _targetEditMemo.key, "key");

    var newMemo = _.extend({}, {
        text: _allContext
    });
    var _newMemos = _parseMemo(newMemo);

    memos.splice(index, 1);
    if (_newMemos != null) {
        var len = _newMemos.length;
        for (var idx=0; idx<len; idx++) {
            memos.splice(index+idx, 0, _newMemos[idx]);
        }
        memos[index + len -1].mtype = Constants.MemoType.EDIT_MEMO;
    }
}

function addNewMemo(_targetEditMemo, _context) {
    var index = _indexOf(memos, _targetEditMemo.key, "key");
    var newMemo = _.extend({}, {
        text: _context
    });
    var _newMemos = _parseMemo(newMemo);

    if (_newMemos != null) {
        var len = _newMemos.length;

        for (var idx=0; idx<len; idx++) {
            memos.splice(index+idx+1, 0, _newMemos[idx]);
        }
    }
}

function deleteMemo(_targetMemo) {
    var index = _indexOf(memos, _targetMemo.key, "key");
    memos.splice(index, 1);
}

function startEditMemo(_targetCompleteMemo) {
    for (var idx=0; idx<memos.length; idx++) {
        if (memos[idx].mtype == Constants.MemoType.EDIT_MEMO) {
            endEditMemo(memos[idx]);
        }
    }

    var index = _indexOf(memos, _targetCompleteMemo.key, "key");

    if (memos[index].mtype == Constants.MemoType.GLOBAL_EDIT_MEMO) {
        return;
    }
    _targetCompleteMemo.mtype = Constants.MemoType.EDIT_MEMO;
    _targetCompleteMemo.haveToFocus = false;
    memos[index] = _.extend({}, memos[index], _targetCompleteMemo);
}

function startEditMemoFromMemoViewer(_targetCompleteMemo) {
    for (var idx=0; idx<memos.length; idx++) {
        if (memos[idx].mtype == Constants.MemoType.EDIT_MEMO) {
            endEditMemo(memos[idx]);
        }
    }

    var index = _indexOf(memos, _targetCompleteMemo.key, "key");

    if (memos[index].mtype == Constants.MemoType.GLOBAL_EDIT_MEMO) {
        return;
    }

    _targetCompleteMemo.mtype = Constants.MemoType.EDIT_MEMO;
    _targetCompleteMemo.haveToFocus = true;
    memos[index] = _.extend({}, memos[index], _targetCompleteMemo);
}


function endEditMemoAndStartNextEditMemo(_targetEditMemo) {
    var index = _indexOf(memos, _targetEditMemo.key, "key");
    if (index == memos.length - 2) {
        endEditMemo(_targetEditMemo);
        return;
    }
    var _nextTargetMemo = memos[index+1];
    endEditMemo(_targetEditMemo);
    startEditMemo(_nextTargetMemo);
}


function endEditMemoAndStartPreviousEditMemo(_targetEditMemo) {
    var index = _indexOf(memos, _targetEditMemo.key, "key");
    if (index == 0) {
        endEditMemo(_targetEditMemo);
        return;
    }
    else if (memos[index].mtype == Constants.MemoType.GLOBAL_EDIT_MEMO) {
        var context = memos[index].text;
        startEditMemo(memos[index-1]);
        return;
    }
    else {
        var _previousTargetMemo = memos[index-1];
        endEditMemo(_targetEditMemo);
        startEditMemo(_previousTargetMemo);
    }
}


function endEditMemo(_targetEditMemo) {
    var index = _indexOf(memos, _targetEditMemo.key, "key");

    if (memos[index].hasOwnProperty("haveToFocus")) {
        memos[index].haveToFocus = false;
    }

    var _newMemos = _parseMemo(_targetEditMemo);

    if (_newMemos != null) {
        var len = _newMemos.length;

        for (var idx=0; idx<len-1; idx++) {
            memos.splice(index+idx, 0, _newMemos[idx]);
        }
        memos[index + len - 1] = _.extend({}, memos[index + len - 1], _newMemos[len - 1]);
    }
    else {
        deleteMemo(_targetEditMemo);
    }
}




//Helper Function
//도우미 함수입니다.
// _indexOf: 메모의 위치를 찾습니다.
// _parseMemo: 메모의 내용을 입력받아 저장 가능한 메모로 반환합니다.
function _indexOf(arr, searchId, property) {
    for(var i = 0, len = arr.length; i < len; i++) {
        if (arr[i][property] === searchId) return i;
    }
    return -1;
}

function _parseMemo(_unParsedMemo) {
    var resultMemos = new Array();
    var protoMemo = {
        key: null,
        title: null,
        text: "",
        mtype: Constants.MemoType.NONE_MEMO,
        date: null
    };

    var regEx = /^[^#\s]?(#)[ \t].+/gm;
    var _arr, result = new Array();
    while ((_arr = regEx.exec(_unParsedMemo.text)) !== null) {
        result.push({
            _title: _arr[0],
            _index: _arr.index
        });
    }
    var len = result.length;

    if (len == 0) {
        if (_unParsedMemo.text != "") {
            var memo = _.extend(protoMemo, {
                title: "(No Title)",
                mtype: Constants.MemoType.NONE_MEMO,
                text: _unParsedMemo.text,
                date: new Date()
            });
            resultMemos.push(memo);
        }
    }
    else {
        var index = 0;
        var text;
        for (var idx=0; idx<len; idx++) {
            if (idx == len-1) {
                text = (_unParsedMemo.text).slice(index, (_unParsedMemo.text).length);
            }
            else {
                text = (_unParsedMemo.text).slice(index, result[idx + 1]._index);
                index = result[idx+1]._index;
            }

            var _memo = _.extend({
                title: (result[idx]._title).slice(2, (result[idx]._title).length),
                text: text,
                mtype: Constants.MemoType.COMPLETE_MEMO,
                date: new Date()
            });

            resultMemos.push(_memo);
        }
    }

    if (resultMemos.length == 0) {
        return null;
    }
    else {
        for (var idx=0; idx<resultMemos.length; idx++) {
            resultMemos[idx] = _.extend({}, resultMemos[idx], {
                key: uuid.v4()
            });
        }
    }
    return resultMemos;
}





//Public Function
//공개 함수 영역입니다. 데이터를 반환합니다.
var NoteStore = _.extend({}, EventEmitter.prototype, {
    getMemo: function() {
        return memos;
    },

    getNoteID: function() {
        return selectNote.idAttribute;
    },

    getNoteNodeID: function() {
        return selectNote.nodeId;
    },

    getNoteTitle: function() {
        return selectNote.title;
    },

    getNoteDate: function() {
        return selectNote.date;
    },

    emitInit: function() {
        this.emit('init');
    },

    emitChange: function() {
        this.emit('change'); //데이터가 변경됬을 때, 이벤트를 발생합니다.
    },

    emitAutoSaveRequest: function() {
        this.emit('auto-save-request');
    },

    emitFocus: function() {
        this.emit('focus');
    },

    addInitListener: function(callback) {
        this.on('init', callback);
    },

    removeInitListener: function(callback) {
        this.removeListener('init', callback);
    },

    addFocusListener: function(callback) {
        this.on('focus', callback);
    },

    removeFocusListener: function(callback) {
        this.removeListener('focus', callback);
    },

    addChangeListener: function(callback) {
        this.on('change', callback);
    },

    removeChangeListener: function(callback) {
        this.removeListener('change', callback);
    },

    addAutoSaveRequestListener: function(callback) {
        this.on('auto-save-request', callback);
    },

    removeAutoSaveRequestListener: function(callback) {
        this.removeListener('auto-save-request', callback);
    }
});


//Regist Callback Function
//디스패처에 Store의 콜백 함수를 등록합니다.
AppDispatcher.register(function(payload) {
    var action = payload.action;

    switch(action.actionType) {
        case Constants.NoteActionTypes.RECEIVE_NOTE:
            initNote(action.selectNote);
            NoteStore.emitInit();
            break;

        case Constants.MemoActionTypes.RECEIVE_MEMO:
            initMemo(action.memos);
            break;

        case Constants.MemoActionTypes.ADD_MEMO:
            addMemo(action.targetEditMemo, action.context);
            break;

        case Constants.MemoActionTypes.ADD_MEMO_IN_EDIT_MEMO:
            addMemoInEditMemo(action.targetEditMemo, action.allContext);
            break;

        case Constants.MemoActionTypes.ADD_NEW_MEMO:
            addNewMemo(action.targetEditMemo, action.context);
            break;

        case Constants.MemoActionTypes.DELETE_MEMO:
            deleteMemo(action.targetCompleteMemo);
            break;

        case Constants.MemoActionTypes.START_EDIT_MEMO:
            startEditMemo(action.targetCompleteMemo);
            break;

        case Constants.MemoActionTypes.START_EDIT_MEMO_FROM_MEMO_VIEWER:
            startEditMemoFromMemoViewer(action.targetCompleteMemo);
            break;

        case Constants.MemoActionTypes.END_EDIT_MEMO_AND_START_NEXT_EDIT_MEMO:
            endEditMemoAndStartNextEditMemo(action.targetEditMemo);
            NoteStore.emitFocus();
            break;

        case Constants.MemoActionTypes.END_EDIT_MEMO_AND_START_PREVIOUS_EDIT_MEMO:
            endEditMemoAndStartPreviousEditMemo(action.targetEditMemo);
            NoteStore.emitFocus();
            break;

        case Constants.MemoActionTypes.END_EDIT_MEMO:
            endEditMemo(action.targetEditMemo);
            break;
    }

    if (action.actionType != Constants.AutoSaveActionTypes.RECEIVE_SAVE
        && action.actionType != Constants.AutoSaveActionTypes.REQUEST_SAVE
        && action.actionType != Constants.SearchActionTypes.RECEIVE_INDEXING_TABLE) {
            NoteStore.emitChange();
    }


    if ( action.actionType == Constants.MemoActionTypes.ADD_MEMO
        || action.actionType == Constants.MemoActionTypes.ADD_MEMO_IN_EDIT_MEMO
        || action.actionType == Constants.MemoActionTypes.DELETE_MEMO
        || action.actionType == Constants.MemoActionTypes.END_EDIT_MEMO
        || action.actionType == Constants.MemoActionTypes.END_EDIT_MEMO_AND_START_NEXT_EDIT_MEMO
        || action.actionType == Constants.MemoActionTypes.END_EDIT_MEMO_AND_START_PREVIOUS_EDIT_MEMO) {
            NoteStore.emitAutoSaveRequest();
    }

    return true;
});


module.exports = NoteStore;