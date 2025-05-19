'use client'
import { ChangeEvent, useEffect, useState } from "react"

const Input = ({
    customClassName = "",
    onChange,
    validate,
    value,
    showError,
    errorMessage,
    ...rest
}: any) => {

    const [inputVal, setInputVal] = useState("")

    const _onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { value: currentVal } = e.target
        if (!validate || validate?.(currentVal) || currentVal === "") {
            setInputVal(currentVal)
            onChange?.(currentVal)
        }
    }

    useEffect(() => {
        setInputVal(value)
    }, [value])

    return (
        <div>
            <input
                className={`py-3 text-black px-2 outline-none rounded-xl-10 w-full ${customClassName}`}
                value={inputVal}
                onChange={_onChange}
                {...rest}
            />
            {
                (showError && errorMessage) ? <div className={`text-error text-xs mt-1`}>{errorMessage}</div> : null
            }
        </div>
    )
}

export default Input