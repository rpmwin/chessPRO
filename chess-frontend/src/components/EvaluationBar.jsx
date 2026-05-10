import React, { useState, useEffect } from "react";

export const EvaluationBar = ({ cp }) => {
    const [barStyles, setBarStyles] = useState({
        whiteHeight: "50%",
        blackHeight: "50%",
    });

    useEffect(() => {
        const clampedCP = Math.max(-1000, Math.min(1000, cp));
        const whiteHeight = 50 + clampedCP / 20;
        setBarStyles({
            whiteHeight: `${whiteHeight}%`,
            blackHeight: `${100 - whiteHeight}%`,
        });
    }, [cp]);

    return (
        <div
            style={{
                width: 30,
                height: 500,
                border: "1px solid #ccc",
                borderRadius: 4,
                overflow: "hidden",
                margin: "0 auto",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                }}
            >
                <div
                    style={{
                        height: barStyles.blackHeight,
                        backgroundColor: "black",
                        transition: "height 0.5s",
                    }}
                />
                <div
                    style={{
                        height: barStyles.whiteHeight,
                        backgroundColor: "white",
                        transition: "height 0.5s",
                    }}
                />
            </div>
            <div style={{ textAlign: "center", color: "white", marginTop: 8 }}>
                {(cp / 100).toFixed(2)}
            </div>
        </div>
    );
};
