import "./App.scss";
import { RubiksCube } from "./RubiksCube/RubiksCube";

function Cover() {
  return (
    <div className="cover">
      <h1>Hello World!</h1>
    </div>
  );
}

export function App() {
  return (
    <>
      {/* <Cover></Cover> */}
      <RubiksCube></RubiksCube>
    </>
  );
}
