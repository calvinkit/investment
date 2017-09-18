#!/bin/bash

while true; do
    case `date +%w` in
    [1-5])
        case `date +%H` in 
        06)
            case `date +%M` in 
            0[1-2])
                #$HOME/analysis/bin/daily.sh
                ;;
            esac
            ;;
        0[8-9])
            case `date +%M` in 
            0[1-2])
                #$HOME/analysis/bin/intraday.sh
                $HOME/analysis/bin/portfolio.sh
                ;;
            3[0-2])
                $HOME/analysis/bin/portfolio.sh
                ;;
            esac
            ;;
        1[0-5])
            case `date +%M` in 
            0[1-2])
                #$HOME/analysis/bin/intraday.sh
                ;;
            [0-5]0)
                $HOME/analysis/bin/portfolio.sh
                ;;
            esac
            ;;
        16)
            case `date +%M` in 
            [0-2]0)
                $HOME/analysis/bin/portfolio.sh
                ;;
            esac
            ;;
        esac
        ;;
    esac
    sleep 60
done
