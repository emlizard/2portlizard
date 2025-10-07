// Theme toggle functionality
    function toggleTheme() {
      const html = document.documentElement;
      const themeIcon = document.getElementById('theme-icon');
      const currentTheme = html.getAttribute('data-theme');
      
      if (currentTheme === 'light') {
        html.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-sun';
      } else {
        html.setAttribute('data-theme', 'light');
        themeIcon.className = 'fas fa-moon';
      }
    }

    const paramMap = {
      S: ['S11','S12','S21','S22'],
      Z: ['Z11','Z12','Z21','Z22'],
      Y: ['Y11','Y12','Y21','Y22'],
      ABCD: ['A','B','C','D']
    };

    const paramLabels = {
      S: ['S₁₁','S₁₂','S₂₁','S₂₂'],
      Z: ['Z₁₁','Z₁₂','Z₂₁','Z₂₂'],
      Y: ['Y₁₁','Y₁₂','Y₂₁','Y₂₂'],
      ABCD: ['A','B','C','D']
    };

    function setupInputs() {
      const container = document.getElementById('paramInputs');
      container.innerHTML = '';
      const type = document.getElementById('inputType').value;
      const params = paramMap[type];
      const labels = paramLabels[type];
      
      params.forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'parameter-input';
        div.innerHTML = `
          <div class="param-label">${labels[index]}</div>
          <div class="complex-inputs">
            <input id="${name}r" type="number" step="any" value="0" placeholder="Real">
            <span class="operator">+j</span>
            <input id="${name}i" type="number" step="any" value="0" placeholder="Imag">
          </div>
        `;
        container.appendChild(div);
      });
      
      // Set default values for demonstration
      if (type === 'S') {
        document.getElementById('S11r').value = '0.2';
        document.getElementById('S11i').value = '0.1';
        document.getElementById('S12r').value = '0.8';
        document.getElementById('S12i').value = '0.0';
        document.getElementById('S21r').value = '0.8';
        document.getElementById('S21i').value = '0.0';
        document.getElementById('S22r').value = '0.3';
        document.getElementById('S22i').value = '0.2';
      }
    }

    document.getElementById('inputType').addEventListener('change', setupInputs);
    window.addEventListener('load', setupInputs);

    function getSfromInput() {
      const Z0 = parseFloat(document.getElementById('z0').value);
      const type = document.getElementById('inputType').value;
      const names = paramMap[type];
      const vals = names.map(n => math.complex(
        parseFloat(document.getElementById(n + 'r').value) || 0,
        parseFloat(document.getElementById(n + 'i').value) || 0
      ));
      const M = math.matrix([[vals[0], vals[1]], [vals[2], vals[3]]]);
      const I = math.identity(2);

      if (type === 'S') return M;
      if (type === 'Z') return math.multiply(
        math.subtract(M, math.multiply(Z0, I)),
        math.inv(math.add(M, math.multiply(Z0, I)))
      );
      if (type === 'Y') {
        const Z = math.inv(M);
        return math.multiply(
          math.subtract(Z, math.multiply(Z0, I)),
          math.inv(math.add(Z, math.multiply(Z0, I)))
        );
      }
      if (type === 'ABCD') {
        const [A,B,C,D] = vals;
        const Δ = math.add(
          math.add(A, math.divide(B, Z0)),
          math.add(math.multiply(C, Z0), D)
        );
        const S11 = math.divide(math.subtract(math.subtract(A, D),
                     math.add(math.divide(B,Z0), math.multiply(C,Z0))), Δ);
        const S21 = math.divide(2, Δ);
        const S12 = math.divide(math.multiply(2, math.subtract(math.multiply(A,D), math.multiply(B,C))), Δ);
        const S22 = math.divide(math.add(math.subtract(D, A),
                     math.subtract(math.divide(B,Z0), math.multiply(C,Z0))), Δ);
        return math.matrix([[S11, S12],[S21, S22]]);
      }
    }

    function formatComplexNumber(c) {
      const real = math.re(c);
      const imag = math.im(c);
      const realStr = Math.abs(real) < 1e-10 ? '0.0000' : real.toFixed(4);
      const imagStr = Math.abs(imag) < 1e-10 ? '0.0000' : Math.abs(imag).toFixed(4);
      const sign = imag >= 0 ? '+' : '-';
      return `${realStr} ${sign} j${imagStr}`;
    }

    function showError(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
      document.body.appendChild(errorDiv);
      
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }

    function convert() {
      const resultsContainer = document.getElementById('results');
      
      // Show loading state
      resultsContainer.innerHTML = '<div class="calculating">Converting parameters...</div>';
      
      setTimeout(() => {
        try {
          const Z0 = parseFloat(document.getElementById('z0').value);
          const S = getSfromInput();
          const I = math.identity(2);
          const Z = math.multiply(Z0, math.multiply(math.add(I,S), math.inv(math.subtract(I,S))));
          const Y = math.inv(Z);
          const Z11 = Z.get([0,0]), Z12 = Z.get([0,1]),
                Z21 = Z.get([1,0]), Z22 = Z.get([1,1]);
          const detZ = math.subtract(math.multiply(Z11,Z22), math.multiply(Z12,Z21));
          const A = math.divide(Z11, Z21),
                B = math.divide(detZ, Z21),
                C = math.divide(1, Z21),
                D = math.divide(Z22, Z21);
          
          const outType = document.getElementById('outputType').value;
          let M;
          if (outType === 'S')       M = S;
          else if (outType === 'Z')  M = Z;
          else if (outType === 'Y')  M = Y;
          else                       M = math.matrix([[A,B],[C,D]]);

          const labels = paramLabels[outType];
          const vals = [M.get([0,0]), M.get([0,1]), M.get([1,0]), M.get([1,1])];
          
          let html = `
            <div class="result-display">
              <div class="result-title">
                <i class="fas fa-check-circle"></i>
                ${outType}-Parameter Matrix
              </div>
              <div class="result-grid">
          `;
          
          vals.forEach((c, i) => {
            html += `
              <div class="result-item">
                <div class="result-label">${labels[i]}</div>
                <div class="result-value updated">${formatComplexNumber(c)}</div>
              </div>
            `;
          });
          
          html += `
              </div>
            </div>
          `;
          
          resultsContainer.innerHTML = html;
          resultsContainer.className = 'animate-in';
        } catch (error) {
          showError(`Conversion error: ${error.message}`);
          resultsContainer.innerHTML = '<div class="placeholder-state">Conversion failed. Please check your input values.</div>';
        }
      }, 800);
    }
