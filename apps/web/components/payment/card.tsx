"use client";

import React from "react";
import styled from "styled-components";

const Card = () => {
  return (
    <StyledWrapper>
      <div className="container">
        <div className="left-side">
          <div className="card">
            <div className="card-line" />
            <div className="buttons" />
          </div>

          <div className="post">
            <div className="post-line" />
            <div className="screen">
              <div className="dollar">$</div>
            </div>
            <div className="numbers" />
            <div className="numbers-line2" />
          </div>
        </div>

        <div className="right-side">
          <div className="new">New Transaction</div>

          <svg viewBox="0 0 451.846 451.847" height={512} width={512} xmlns="http://www.w3.org/2000/svg" className="arrow">
            <path fill="#cfcfcf" data-old_color="#000000" className="active-path" data-original="#000000" d="M345.441 248.292L151.154 442.573c-12.359 12.365-32.397 12.365-44.75 0-12.354-12.354-12.354-32.391 0-44.744L278.318 225.92 106.409 54.017c-12.354-12.359-12.354-32.394 0-44.748 12.354-12.359 32.391-12.359 44.75 0l194.287 194.284c6.177 6.18 9.262 14.271 9.262 22.366 0 8.099-3.091 16.196-9.267 22.373z" />
          </svg>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: inline-block;

  .container { background-color: #ffffff; display: flex; width: 460px; height: 120px; position: relative; border-radius: 6px; transition: 0.3s ease-in-out; }
  .left-side { background-color: #5de2a3; width: 130px; height: 120px; border-radius: 4px; position: relative; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.3s; flex-shrink: 0; overflow: hidden; }
  .right-side { width: calc(100% - 130px); display: flex; align-items: center; overflow: hidden; cursor: pointer; justify-content: space-between; white-space: nowrap; transition: 0.3s; }
  .right-side:hover { background-color: #f9f7f9; }
  .arrow { width: 20px; height: 20px; margin-right: 20px; }
  .new { font-size: 23px; font-family: "Lexend Deca", sans-serif; margin-left: 20px; }
  .card { width: 70px; height: 46px; background-color: #c7ffbc; border-radius: 6px; position: absolute; display: flex; z-index: 10; flex-direction: column; align-items: center; -webkit-box-shadow: 9px 9px 9px -2px rgba(77, 200, 143, 0.72); -moz-box-shadow: 9px 9px 9px -2px rgba(77, 200, 143, 0.72); box-shadow: 9px 9px 9px -2px rgba(77, 200, 143, 0.72); }
  .card-line { width: 65px; height: 13px; background-color: #80ea69; border-radius: 2px; margin-top: 7px; }
  @media only screen and (max-width: 480px) { .container { transform: scale(0.7); transform-origin: left center; } .new { font-size: 18px; } }
  .buttons { width: 8px; height: 8px; background-color: #379e1f; box-shadow: 0 -10px 0 0 #26850e, 0 10px 0 0 #56be3e; border-radius: 50%; transform: rotate(90deg); margin: 10px 0 0 -30px; }
  .card { animation: slide-top 2.4s cubic-bezier(0.645, 0.045, 0.355, 1) infinite; }
  .post { animation: slide-post 2.4s cubic-bezier(0.165, 0.84, 0.44, 1) infinite; }
  @keyframes slide-top {
    0%, 10% { opacity: 1; transform: translateY(0) rotate(0); }
    42%, 52% { opacity: 1; transform: translateY(-70px) rotate(90deg); }
    76% { opacity: 1; transform: translateY(-8px) rotate(90deg); }
    88% { opacity: 0; transform: translateY(-8px) rotate(90deg); }
    88.01% { opacity: 0; transform: translateY(0) rotate(0); }
    100% { opacity: 1; transform: translateY(0) rotate(0); }
  }
  .post { width: 63px; height: 75px; background-color: #dddde0; position: absolute; z-index: 11; bottom: 10px; top: 120px; border-radius: 6px; overflow: hidden; }
  .post-line { width: 47px; height: 9px; background-color: #545354; position: absolute; border-radius: 0 0 3px 3px; right: 8px; top: 8px; }
  .post-line::before { content: ""; position: absolute; width: 47px; height: 9px; background-color: #757375; top: -8px; }
  .screen { width: 47px; height: 23px; background-color: #ffffff; position: absolute; top: 22px; right: 8px; border-radius: 3px; }
  .numbers { width: 12px; height: 12px; background-color: #838183; box-shadow: 0 -18px 0 0 #838183, 0 18px 0 0 #838183; border-radius: 2px; position: absolute; transform: rotate(90deg); left: 25px; top: 52px; }
  .numbers-line2 { width: 12px; height: 12px; background-color: #aaa9ab; box-shadow: 0 -18px 0 0 #aaa9ab, 0 18px 0 0 #aaa9ab; border-radius: 2px; position: absolute; transform: rotate(90deg); left: 25px; top: 68px; }
  @keyframes slide-post {
    0%, 42% { opacity: 1; transform: translateY(0); }
    76% { opacity: 1; transform: translateY(-70px); }
    88% { opacity: 0; transform: translateY(-70px); }
    88.01% { opacity: 0; transform: translateY(0); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .dollar { position: absolute; font-size: 16px; font-family: "Lexend Deca", sans-serif; width: 100%; left: 0; top: 0; color: #4b953b; text-align: center; }
  .dollar { animation: fade-in-fwd 2.4s ease infinite; }
  @keyframes fade-in-fwd {
    0%, 55% { opacity: 0; transform: translateY(-5px); }
    70%, 82% { opacity: 1; transform: translateY(0); }
    88%, 100% { opacity: 0; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) { .card, .post, .dollar { animation: none; } }
`;

export default Card;
