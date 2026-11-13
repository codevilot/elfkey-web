import { forwardRef, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { MODIFIERS } from "../../lib/elfkey/draft";
export const InputTester = forwardRef<
  HTMLTextAreaElement,
  { disabled: boolean }
>(({ disabled }, ref) => {
  const [last, setLast] = useState<string | null>(null),
    [value, setValue] = useState("");
  return (
    <section className="panel tester-panel">
      <div className="tester-title">
        <span className="test-icon">
          <Icon name="check" size={20} />
        </span>
        <div>
          <span className="eyebrow">04 · 눌러서 확인</span>
          <h2>저장한 페달, 바로 눌러보세요</h2>
          <p>
            아래 입력 칸에서 새 키가 나오는지 확인해주세요. 새로고침은 필요하지
            않아요.
          </p>
        </div>
      </div>
      <div className="tester-content">
        <label className="sr-only" htmlFor="keyTest">
          실제 키 입력 테스트
        </label>
        <textarea
          id="keyTest"
          ref={ref}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) =>
            setLast(
              [...MODIFIERS.filter((m) => e.getModifierState(m)), e.code].join(
                " + ",
              ),
            )
          }
          placeholder="여기를 클릭하고, 장치의 페달을 눌러주세요."
          rows={2}
        />
        <div className="test-status">
          <span>
            <i className={last ? "is-detected" : ""} />
            {last ? "브라우저가 받은 마지막 입력" : "입력을 기다리고 있어요"}
          </span>
          {last && <kbd>{last}</kbd>}
          <button
            type="button"
            onClick={() => {
              setLast(null);
              setValue("");
            }}
          >
            지우기
          </button>
        </div>
      </div>
      <p className="fine-print">
        브라우저·운영체제가 예약한 단축키는 실제 사용할 앱에서 확인해주세요.
      </p>
    </section>
  );
});
InputTester.displayName = "InputTester";
