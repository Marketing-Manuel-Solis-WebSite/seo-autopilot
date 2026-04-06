#!/bin/bash

broken_imports=()

# Process all TS/TSX files
find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/.next/*" ! -path "*/node_modules/*" | while read filepath; do
    while IFS= read -r line; do
        # Extract import statements
        if [[ $line =~ from[[:space:]]+[\'\"]([@.][^\'\"]+)[\'\" ]]; then
            import="${BASH_REMATCH[1]}"
            
            # Only process local imports
            if [[ "$import" =~ ^[@\.] ]]; then
                # Get line number
                linenum=$(grep -n "from ['\"]$import['\"]" "$filepath" | cut -d: -f1 | head -1)
                
                # Resolve path
                if [[ "$import" =~ ^@/ ]]; then
                    target="${import/@\//}"
                    target="./$target"
                else
                    target="$(dirname "$filepath")/$import"
                fi
                
                # Normalize path
                target=$(echo "$target" | sed 's|//|/|g' | sed 's|/\./|/|g')
                target="${target/#\.\//}"
                
                # Check if exists
                found=0
                if [ -f "$target" ]; then
                    found=1
                elif [ -f "$target.ts" ]; then
                    found=1
                elif [ -f "$target.tsx" ]; then
                    found=1
                elif [ -f "$target.js" ]; then
                    found=1
                elif [ -f "$target.jsx" ]; then
                    found=1
                elif [ -f "$target/index.ts" ]; then
                    found=1
                elif [ -f "$target/index.tsx" ]; then
                    found=1
                fi
                
                if [ $found -eq 0 ]; then
                    echo "$filepath:$linenum:from '$import' - target not found: $target"
                fi
            fi
        fi
    done < "$filepath"
done

