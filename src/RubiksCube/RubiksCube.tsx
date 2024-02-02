import { useEffect, useState } from "react";
import { CanvasRenderer, RotateAction } from "./CanvasRenderer";
import { SvgRenderer } from "./SvgRenderer";
import "./RubiksCube.scss";
import { AxisName } from "./Utils";
import { Button, Form, Modal, Slider, Space, Tooltip } from "antd";
import {
  SettingOutlined,
  UndoOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

export interface Config {
  order: number;
}

const canvasRenderer = new CanvasRenderer();
const svgRenderer = new SvgRenderer();

export function RubiksCube() {
  const [config, setConfig] = useState<Config>({ order: 5 });
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<RotateAction[]>([]);

  useEffect(() => {
    canvasRenderer.setCallback({
      start: (axisName: AxisName, stepOnAxis: number) =>
        svgRenderer.start(axisName, stepOnAxis),
      move: (angle: number) => svgRenderer.move(angle),
      end: () => svgRenderer.end(),
      action: (action: RotateAction) => setHistory((prev) => [...prev, action]),
    });
  }, []);

  return (
    <div className="rubiks-cube">
      <Modal
        footer={null}
        title="设置"
        open={open}
        onCancel={() => setOpen(false)}
      >
        <Form
          initialValues={{ ...config }}
          onFinish={(values) => {
            setConfig(values);
            setOpen(false);
            setHistory([]);
          }}
          onReset={() => setOpen(false)}
        >
          <Form.Item label="阶数" colon name="order">
            <Slider min={1} max={10}></Slider>
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Space>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
              <Button type="default" htmlType="reset">
                取消
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Space className="settings" size={2}>
        <Tooltip title="撤销">
          <Button
            icon={<UndoOutlined />}
            disabled={!history.length}
            onClick={() => {
              const list = history.slice();
              canvasRenderer.undo(list.pop()!);
              setHistory(list);
            }}
          ></Button>
        </Tooltip>
        <Tooltip title="复原">
          <Button
            icon={<CheckCircleOutlined />}
            disabled={!history.length}
            onClick={() => {
              const list = history.slice();
              while (list.length) {
                canvasRenderer.undo(list.pop()!);
              }
              setHistory(list);
            }}
          ></Button>
        </Tooltip>
        <Tooltip title="设置">
          <Button
            icon={<SettingOutlined />}
            onClick={() => setOpen(true)}
          ></Button>
        </Tooltip>
      </Space>
      <div className="half">{svgRenderer.render(config)}</div>
      <div className="half">{canvasRenderer.render(config)}</div>
    </div>
  );
}
