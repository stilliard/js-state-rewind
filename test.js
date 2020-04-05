const test = require('ava');
const StateRewind = require('./index');

test('simple-example', t => {

    const state = new StateRewind;

    state.set(5);
    t.is(state.get(), 5);
    state.set(10);
    t.is(state.get(), 10);
    state.set(17);
    t.is(state.get(), 17);
    state.undo();
    t.is(state.get(), 10);
    state.redo();
    t.is(state.get(), 17);
    state.undo();
    state.undo();
    t.is(state.get(), 5);
    state.redo();
    state.redo();
    t.is(state.get(), 17);
    t.deepEqual(state.getAll(), [5, 10, 17]);

});

test('exec-example', t => {

    t.plan(14); // number of tests (to make sure the callbacks are run correctly in undo's redo's)

    const state = new StateRewind;

    state.exec({ text: 'hello' }, function () {
        t.pass();
    }, function () {
        t.pass();
        t.pass();
    }); // exec auto calls the 1st pass

    t.deepEqual(state.get(), { text: 'hello' }); // 2nd

    state.undo(); // should trigger the 3nd and 4th passes (2 to make sure it's different to the forward call)

    t.is(state.get(), undefined); // 5th

    state.redo(); // should trigger the 6th pass

    t.deepEqual(state.get(), { text: 'hello' }); // 7th

    state.set({ text: 'goodbye' }, function () {
        t.fail(); // should never be called
    }, function () {
        t.pass();
        t.pass();
        t.pass();
        t.pass();
        t.pass();
    }); // shouldn't change pass count

    t.deepEqual(state.get(), { text: 'goodbye' }); // 8th

    state.undo(); // another 5 passes bringing it to the 13th, just to prove it's good ;D

    t.deepEqual(state.get(), { text: 'hello' }); // 14th

});

test('squash-example', t => {
    const state = new StateRewind;

    // first change
    state.set({
        timestamp: '2020-04-04 11:52:00',
        selector: '#el span',
        type: 'text',
        change: {
            from: 'Hello',
            to: 'World'
        }
    });

    // now a series of 3 changes to the same selector and type (we'll then swuahs these down)

    state.set({
        timestamp: '2020-04-04 11:54:00',
        selector: '.another strong',
        type: 'text',
        change: {
            from: 'Start text',
            to: 'First change'
        }
    });

    state.set({
        timestamp: '2020-04-04 11:56:00',
        selector: '.another strong',
        type: 'text',
        change: {
            from: 'First change',
            to: '2nd change'
        }
    });

    state.set({
        timestamp: '2020-04-04 11:58:00',
        selector: '.another strong',
        type: 'text',
        change: {
            from: '2nd change',
            to: 'Last change!!'
        }
    });

    state.squash(function (prev, next) {
        return prev.selector == next.selector && prev.type == next.type;
    }, function (prev, next) {
        next.change.from = prev.change.from; // keep the initial "from text" as we squash down to the latest "to text"
        return next;
    });

    t.deepEqual(state.getAll(), [
        {
            timestamp: '2020-04-04 11:52:00',
            selector: '#el span',
            type: 'text',
            change: {
                from: 'Hello',
                to: 'World'
            }
        },
        {
            timestamp: '2020-04-04 11:58:00',
            selector: '.another strong',
            type: 'text',
            change: {
                from: 'Start text', // here we want the original text as we squashed down with a callback to keep this
                to: 'Last change!!'
            }
        }
    ]);

});