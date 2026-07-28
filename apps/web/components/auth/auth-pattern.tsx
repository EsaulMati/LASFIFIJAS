"use client";

import styled from "styled-components";

export function AuthPattern() {
  return (
    <PatternLayer aria-hidden="true">
      <div className="rainPattern" />
    </PatternLayer>
  );
}

const PatternLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at center, transparent 10%, rgb(1 7 12 / 0.42) 72%),
      linear-gradient(180deg, rgb(1 7 12 / 0.18), rgb(1 7 12 / 0.56));
  }

  .rainPattern {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #01070a;
  }

  .rainPattern::before {
    content: "";
    position: absolute;
    inset: -145%;
    rotate: -45deg;
    opacity: 0.34;
    background-color: #01070a;
    background-image:
      radial-gradient(4px 100px at 0 235px, #2dd4bf, transparent),
      radial-gradient(4px 100px at 300px 235px, #34d399, transparent),
      radial-gradient(1.5px 1.5px at 150px 117.5px, #6ee7b7 100%, transparent 150%),
      radial-gradient(4px 100px at 0 252px, #0d9488, transparent),
      radial-gradient(4px 100px at 300px 252px, #10b981, transparent),
      radial-gradient(1.5px 1.5px at 150px 126px, #5eead4 100%, transparent 150%),
      radial-gradient(4px 100px at 0 150px, #2dd4bf, transparent),
      radial-gradient(4px 100px at 300px 150px, #34d399, transparent),
      radial-gradient(1.5px 1.5px at 150px 75px, #6ee7b7 100%, transparent 150%),
      radial-gradient(4px 100px at 0 253px, #0f766e, transparent),
      radial-gradient(4px 100px at 300px 253px, #059669, transparent),
      radial-gradient(1.5px 1.5px at 150px 126.5px, #5eead4 100%, transparent 150%),
      radial-gradient(4px 100px at 0 204px, #2dd4bf, transparent),
      radial-gradient(4px 100px at 300px 204px, #34d399, transparent),
      radial-gradient(1.5px 1.5px at 150px 102px, #6ee7b7 100%, transparent 150%),
      radial-gradient(4px 100px at 0 134px, #0d9488, transparent),
      radial-gradient(4px 100px at 300px 134px, #10b981, transparent),
      radial-gradient(1.5px 1.5px at 150px 67px, #5eead4 100%, transparent 150%),
      radial-gradient(4px 100px at 0 179px, #2dd4bf, transparent),
      radial-gradient(4px 100px at 300px 179px, #34d399, transparent),
      radial-gradient(1.5px 1.5px at 150px 89.5px, #6ee7b7 100%, transparent 150%),
      radial-gradient(4px 100px at 0 299px, #0f766e, transparent),
      radial-gradient(4px 100px at 300px 299px, #059669, transparent),
      radial-gradient(1.5px 1.5px at 150px 149.5px, #5eead4 100%, transparent 150%),
      radial-gradient(4px 100px at 0 215px, #2dd4bf, transparent),
      radial-gradient(4px 100px at 300px 215px, #34d399, transparent),
      radial-gradient(1.5px 1.5px at 150px 107.5px, #6ee7b7 100%, transparent 150%),
      radial-gradient(4px 100px at 0 281px, #0d9488, transparent),
      radial-gradient(4px 100px at 300px 281px, #10b981, transparent),
      radial-gradient(1.5px 1.5px at 150px 140.5px, #5eead4 100%, transparent 150%),
      radial-gradient(4px 100px at 0 158px, #2dd4bf, transparent),
      radial-gradient(4px 100px at 300px 158px, #34d399, transparent),
      radial-gradient(1.5px 1.5px at 150px 79px, #6ee7b7 100%, transparent 150%),
      radial-gradient(4px 100px at 0 210px, #0f766e, transparent),
      radial-gradient(4px 100px at 300px 210px, #059669, transparent),
      radial-gradient(1.5px 1.5px at 150px 105px, #5eead4 100%, transparent 150%);
    background-size:
      300px 235px, 300px 235px, 300px 235px,
      300px 252px, 300px 252px, 300px 252px,
      300px 150px, 300px 150px, 300px 150px,
      300px 253px, 300px 253px, 300px 253px,
      300px 204px, 300px 204px, 300px 204px,
      300px 134px, 300px 134px, 300px 134px,
      300px 179px, 300px 179px, 300px 179px,
      300px 299px, 300px 299px, 300px 299px,
      300px 215px, 300px 215px, 300px 215px,
      300px 281px, 300px 281px, 300px 281px,
      300px 158px, 300px 158px, 300px 158px,
      300px 210px, 300px 210px, 300px 210px;
    animation: auth-rain 150s linear infinite;
  }

  @keyframes auth-rain {
    from { background-position: 0 0; }
    to { background-position: 0 6800px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .rainPattern::before { animation: none; }
  }
`;
