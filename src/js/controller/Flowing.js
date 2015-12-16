import FlowingProto from './_FlowingProto';
import Actions from './Actions';

var Flowing = new FlowingProto();

Flowing.createFlows(Actions.MemoActions);
Flowing.createFlows(Actions.NoteActions);
Flowing.createFlows(Actions.TestActions);

export default Flowing;